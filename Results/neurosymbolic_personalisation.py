"""
Neurosymbolic Personalised Learning Pipeline
=============================================
Architecture:
  Symbolic layer  →  hand-crafted rules over student/attempt features
                     (mastery level, struggle flags, hint dependency, etc.)
  Neural layer    →  MLP that takes raw + symbolic features to predict
                     post_test_score and recommend next difficulty
  Personalisation →  per-student embedding that shifts predictions to
                     each learner's profile

Usage:
  python neurosymbolic_personalisation.py

Outputs:
  - training curves printed to console
  - personalised_recommendations.csv  (one row per student × experiment)
  - model checkpoint  neurosym_model.pt
"""

# ── Imports ────────────────────────────────────────────────────────────────────
import json, warnings
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

warnings.filterwarnings("ignore")
torch.manual_seed(42)
np.random.seed(42)

# ── 1. LOAD DATA ───────────────────────────────────────────────────────────────
print("=" * 60)
print("STEP 1 — Loading data")
print("=" * 60)

attempts    = pd.read_csv('/mnt/user-data/uploads/atempts.csv')
interaction = pd.read_csv('/mnt/user-data/uploads/interaction.csv')
students    = pd.read_csv('/mnt/user-data/uploads/students.csv')
survey      = pd.read_csv('/mnt/user-data/uploads/survey.csv')

print(f"  Attempts    : {len(attempts):>4} rows")
print(f"  Interaction : {len(interaction):>4} rows")
print(f"  Students    : {len(students):>4} rows")
print(f"  Survey      : {len(survey):>4} rows")

# ── 2. FEATURE ENGINEERING FROM INTERACTION EVENTS ────────────────────────────
print("\n" + "=" * 60)
print("STEP 2 — Extracting interaction features")
print("=" * 60)

def parse_event(val):
    try:
        return json.loads(str(val))
    except Exception:
        return {}

# ── 2a. simulation_summary features per attempt
sim_rows = interaction[interaction['event_type'] == 'simulation_summary'].copy()
sim_rows['parsed'] = sim_rows['event_value'].apply(parse_event)
sim_rows['sim_engagement']      = sim_rows['parsed'].apply(lambda d: d.get('engagementScore', np.nan))
sim_rows['sim_interaction_count'] = sim_rows['parsed'].apply(lambda d: d.get('interactionCount', np.nan))
sim_rows['sim_time']            = sim_rows['parsed'].apply(lambda d: d.get('timeTakenSeconds', np.nan))
sim_feats = sim_rows[['attempt_id', 'sim_engagement', 'sim_interaction_count', 'sim_time']].copy()

# ── 2b. section_checkpoint aggregates per attempt
cp_rows = interaction[interaction['event_type'] == 'section_checkpoint'].copy()
cp_rows['parsed']   = cp_rows['event_value'].apply(parse_event)
cp_rows['total_a']  = cp_rows['parsed'].apply(lambda d: d.get('totalAttempts', 0))
cp_rows['wrong_a']  = cp_rows['parsed'].apply(lambda d: d.get('wrongAttempts', 0))
cp_rows['hints']    = cp_rows['parsed'].apply(lambda d: d.get('hintShownCount', 0))
cp_rows['reselect'] = cp_rows['parsed'].apply(lambda d: d.get('reselectionsAfterHint', 0))

cp_agg = cp_rows.groupby('attempt_id').agg(
    cp_total_attempts   = ('total_a',  'sum'),
    cp_wrong_attempts   = ('wrong_a',  'sum'),
    cp_hints_total      = ('hints',    'sum'),
    cp_reselections     = ('reselect', 'sum'),
    cp_sections_done    = ('total_a',  'count'),
).reset_index()
cp_agg['cp_error_rate']    = cp_agg['cp_wrong_attempts'] / (cp_agg['cp_total_attempts'] + 1e-6)
cp_agg['cp_hint_dep']      = cp_agg['cp_hints_total']    / (cp_agg['cp_total_attempts'] + 1e-6)

# ── 2c. behavioural event counts per attempt
behav_events = ['start', 'click', 'adjust_parameter', 'view_graph', 'pause', 'resume', 'submit']
behav = interaction[interaction['event_type'].isin(behav_events)].copy()
behav_agg = behav.groupby(['attempt_id', 'event_type']).size().unstack(fill_value=0).reset_index()
behav_agg.columns = ['attempt_id'] + [f'evt_{c}' for c in behav_agg.columns[1:]]

print(f"  sim_feats   : {sim_feats.shape}")
print(f"  cp_agg      : {cp_agg.shape}")
print(f"  behav_agg   : {behav_agg.shape}")

# ── 3. MERGE ALL FEATURES ──────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 3 — Merging all features")
print("=" * 60)

df = attempts.copy()
df = df.merge(students[['id','age','gender','prior_lab_experience',
                         'year_of_study','program']].rename(columns={'id':'student_id'}),
              on='student_id', how='left')

survey_cols = survey[['attempt_id','understanding','engagement',
                       'difficulty','usability','confidence']].copy()
df = df.merge(survey_cols, left_on='id', right_on='attempt_id', how='left',
              suffixes=('','_srv')).drop(columns=['attempt_id'], errors='ignore')

df = df.merge(sim_feats.rename(columns={'attempt_id':'_aid'}),
              left_on='id', right_on='_aid', how='left').drop(columns='_aid', errors='ignore')
df = df.merge(cp_agg.rename(columns={'attempt_id':'_aid'}),
              left_on='id', right_on='_aid', how='left').drop(columns='_aid', errors='ignore')
df = df.merge(behav_agg.rename(columns={'attempt_id':'_aid'}),
              left_on='id', right_on='_aid', how='left').drop(columns='_aid', errors='ignore')

print(f"  Merged shape: {df.shape}")

# ── 4. SYMBOLIC RULES LAYER ────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 4 — Symbolic rules (hand-crafted domain knowledge)")
print("=" * 60)

def symbolic_features(row):
    feats = {}

    # ── Mastery level (symbolic rule based on pre-test)
    p = row.get('pre_test_score', 0)
    if p >= 80:   feats['sym_mastery'] = 3   # expert
    elif p >= 50: feats['sym_mastery'] = 2   # intermediate
    elif p >= 20: feats['sym_mastery'] = 1   # beginner
    else:         feats['sym_mastery'] = 0   # novice

    # ── Struggle flag: high error rate + high hints
    err  = row.get('cp_error_rate', 0) or 0
    hint = row.get('cp_hint_dep',   0) or 0
    feats['sym_struggle'] = int(err > 0.5 and hint > 0.4)

    # ── Hint dependency flag
    feats['sym_hint_dependent'] = int(hint > 0.5)

    # ── Speed learner: fast + high gain
    lg  = row.get('learning_gain', 0) or 0
    tts = row.get('time_taken_seconds', 1e6) or 1e6
    feats['sym_speed_learner'] = int(lg > 20 and tts < 400)

    # ── Disengaged: low engagement + low interaction
    eng  = row.get('sim_engagement',        50) or 50
    cnt  = row.get('sim_interaction_count', 50) or 50
    feats['sym_disengaged'] = int(eng < 55 and cnt < 40)

    # ── Prior experience bonus
    feats['sym_has_prior_exp'] = int(bool(row.get('prior_lab_experience', False)))

    # ── Recommended difficulty (symbolic)
    ng = row.get('normalized_gain', 0) or 0
    if   ng > 0.7:  feats['sym_rec_difficulty'] = 2  # increase difficulty
    elif ng < 0.1:  feats['sym_rec_difficulty'] = 0  # decrease difficulty
    else:           feats['sym_rec_difficulty'] = 1  # keep same

    return feats

sym_df = df.apply(lambda r: pd.Series(symbolic_features(r)), axis=1)
df = pd.concat([df, sym_df], axis=1)

sym_cols = [c for c in df.columns if c.startswith('sym_')]
print(f"  Symbolic features created: {sym_cols}")
print(df[sym_cols].describe().T[['mean','min','max']].round(2).to_string())

# ── 5. PREPARE NEURAL NETWORK INPUT ───────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 5 — Preparing neural network features")
print("=" * 60)

# Encode categoricals
le_gender  = LabelEncoder()
le_program = LabelEncoder()
le_exp     = LabelEncoder()

df['gender_enc']  = le_gender.fit_transform(df['gender'].fillna('unknown'))
df['program_enc'] = le_program.fit_transform(df['program'].fillna('unknown'))
df['exp_enc']     = df['prior_lab_experience'].astype(int)

# Student index for embedding
student_ids    = df['student_id'].unique().tolist()
student_to_idx = {sid: i for i, sid in enumerate(student_ids)}
df['student_idx'] = df['student_id'].map(student_to_idx)

# Experiment index
exp_ids    = df['experiment_id'].unique().tolist()
exp_to_idx = {eid: i for i, eid in enumerate(exp_ids)}
df['exp_idx'] = df['experiment_id'].map(exp_to_idx)

# Raw numeric features
raw_num_cols = [
    'pre_test_score', 'time_taken_seconds', 'attempt_number',
    'engagement_score', 'age', 'year_of_study',
    'understanding', 'engagement', 'difficulty', 'usability', 'confidence',
    'sim_engagement', 'sim_interaction_count', 'sim_time',
    'cp_total_attempts', 'cp_wrong_attempts', 'cp_hints_total',
    'cp_reselections', 'cp_sections_done', 'cp_error_rate', 'cp_hint_dep',
    'gender_enc', 'program_enc', 'exp_enc',
]
evt_cols = [c for c in df.columns if c.startswith('evt_')]
raw_num_cols += evt_cols

# Fill missing
df[raw_num_cols] = df[raw_num_cols].apply(pd.to_numeric, errors='coerce').fillna(0)

# Symbolic features (already numeric)
all_feature_cols = raw_num_cols + sym_cols

# Scale
scaler = StandardScaler()
df[all_feature_cols] = scaler.fit_transform(df[all_feature_cols])

# Target: post_test_score (regression) + sym_rec_difficulty (already in df)
target_col = 'post_test_score'
df_clean = df.dropna(subset=[target_col]).copy()

print(f"  Total feature columns : {len(all_feature_cols)}")
print(f"  Raw numeric features  : {len(raw_num_cols)}")
print(f"  Symbolic features     : {len(sym_cols)}")
print(f"  Training samples      : {len(df_clean)}")
print(f"  Unique students       : {df_clean['student_idx'].nunique()}")

# ── 6. DATASET & MODEL ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 6 — Building neurosymbolic model")
print("=" * 60)

class LearnerDataset(Dataset):
    def __init__(self, df, feature_cols, target_col):
        self.X   = torch.tensor(df[feature_cols].values, dtype=torch.float32)
        self.y   = torch.tensor(df[target_col].values,   dtype=torch.float32)
        self.sid = torch.tensor(df['student_idx'].values, dtype=torch.long)
        self.eid = torch.tensor(df['exp_idx'].values,     dtype=torch.long)

    def __len__(self):  return len(self.y)

    def __getitem__(self, i):
        return self.X[i], self.sid[i], self.eid[i], self.y[i]


class NeurosymbolicNet(nn.Module):
    """
    Architecture:
      ┌─ Student Embedding (personalisation)
      ├─ Experiment Embedding
      ├─ Raw numeric features  ──► MLP backbone
      └─ Symbolic features     ──► Symbolic encoder → fused with MLP output

    The symbolic pathway is kept separate and then concatenated,
    so the network learns WHEN to trust vs override the rules.
    """
    def __init__(self, n_features, n_sym, n_students, n_experiments,
                 emb_dim=8, hidden=128, dropout=0.3):
        super().__init__()
        self.student_emb = nn.Embedding(n_students,    emb_dim)
        self.exp_emb     = nn.Embedding(n_experiments, emb_dim)

        n_raw = n_features - n_sym

        # Raw feature MLP
        self.raw_encoder = nn.Sequential(
            nn.Linear(n_raw + 2 * emb_dim, hidden),
            nn.LayerNorm(hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, hidden // 2),
            nn.ReLU(),
        )

        # Symbolic encoder (shallow — respect domain knowledge)
        self.sym_encoder = nn.Sequential(
            nn.Linear(n_sym, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
        )

        # Fusion head
        fused_dim = hidden // 2 + 16
        self.fusion = nn.Sequential(
            nn.Linear(fused_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
        )

        # Gating: learn how much to weight symbolic vs neural
        self.gate = nn.Sequential(
            nn.Linear(fused_dim, fused_dim),
            nn.Sigmoid(),
        )

    def forward(self, x, sid, eid):
        s_emb = self.student_emb(sid)          # (B, emb_dim)
        e_emb = self.exp_emb(eid)              # (B, emb_dim)

        n_sym  = len(sym_cols)
        x_raw  = x[:, :-n_sym]
        x_sym  = x[:, -n_sym:]

        raw_in = torch.cat([x_raw, s_emb, e_emb], dim=1)
        h_raw  = self.raw_encoder(raw_in)
        h_sym  = self.sym_encoder(x_sym)

        fused  = torch.cat([h_raw, h_sym], dim=1)
        gate   = self.gate(fused)
        out    = self.fusion(fused * gate)
        return out.squeeze(1)


# Train / val split
idx_train, idx_val = train_test_split(
    range(len(df_clean)), test_size=0.2, random_state=42
)
train_df = df_clean.iloc[idx_train].reset_index(drop=True)
val_df   = df_clean.iloc[idx_val].reset_index(drop=True)

train_ds = LearnerDataset(train_df, all_feature_cols, target_col)
val_ds   = LearnerDataset(val_df,   all_feature_cols, target_col)

train_loader = DataLoader(train_ds, batch_size=16, shuffle=True)
val_loader   = DataLoader(val_ds,   batch_size=16)

n_sym_feats = len(sym_cols)
n_students  = len(student_ids)
n_exps      = len(exp_ids)

model     = NeurosymbolicNet(len(all_feature_cols), n_sym_feats, n_students, n_exps)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)
criterion = nn.MSELoss()

print(f"  Model parameters: {sum(p.numel() for p in model.parameters()):,}")
print(f"  Train samples   : {len(train_ds)}")
print(f"  Val samples     : {len(val_ds)}")

# ── 7. TRAINING LOOP ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 7 — Training")
print("=" * 60)

EPOCHS     = 150
best_val   = float('inf')
best_state = None

for epoch in range(1, EPOCHS + 1):
    # ── train
    model.train()
    train_loss = 0
    for X, sid, eid, y in train_loader:
        optimizer.zero_grad()
        pred = model(X, sid, eid)
        loss = criterion(pred, y)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        train_loss += loss.item() * len(y)
    train_loss /= len(train_ds)

    # ── validate
    model.eval()
    val_preds, val_true = [], []
    with torch.no_grad():
        for X, sid, eid, y in val_loader:
            pred = model(X, sid, eid)
            val_preds.extend(pred.numpy())
            val_true.extend(y.numpy())
    val_loss = mean_absolute_error(val_true, val_preds)

    if val_loss < best_val:
        best_val   = val_loss
        best_state = {k: v.clone() for k, v in model.state_dict().items()}

    scheduler.step()

    if epoch % 25 == 0 or epoch == 1:
        r2 = r2_score(val_true, val_preds)
        print(f"  Epoch {epoch:>3} | train_mse={train_loss:.3f} | val_mae={val_loss:.3f} | val_r2={r2:.3f}")

model.load_state_dict(best_state)
torch.save(best_state, '/home/claude/neurosym_model.pt')
print(f"\n  ✓ Best val MAE: {best_val:.3f} — model saved")

# ── 8. PERSONALISED RECOMMENDATIONS ──────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 8 — Generating personalised recommendations")
print("=" * 60)

# For each student × experiment, predict expected post_test
# and generate recommendation using symbolic + neural outputs

# Use the last known attempt per student × experiment as context
latest = df_clean.sort_values('attempt_number').groupby(
    ['student_id', 'experiment_id']
).last().reset_index()

model.eval()
recs = []

# Inverse-transform scaler to get readable values back
# (we'll use original df for display)
orig_attempts = pd.read_csv('/mnt/user-data/uploads/atempts.csv')
orig_students = pd.read_csv('/mnt/user-data/uploads/students.csv')

for _, row in latest.iterrows():
    sid_idx = student_to_idx.get(row['student_id'], 0)
    eid_idx = exp_to_idx.get(row['experiment_id'], 0)

    x     = torch.tensor(row[all_feature_cols].values.astype(float),
                         dtype=torch.float32).unsqueeze(0)
    s_t   = torch.tensor([sid_idx], dtype=torch.long)
    e_t   = torch.tensor([eid_idx], dtype=torch.long)

    with torch.no_grad():
        pred_post = model(x, s_t, e_t).item()

    # Retrieve original (unscaled) values for display
    orig_row = orig_attempts[orig_attempts['student_id'] == row['student_id']]
    orig_row = orig_row[orig_row['experiment_id'] == row['experiment_id']].sort_values('attempt_number').iloc[-1]

    sym_rec  = int(np.clip(round(float(row.get('sym_rec_difficulty', 1))), 0, 2))
    diff_map = {0: 'decrease', 1: 'maintain', 2: 'increase'}

    student_name = orig_students[orig_students['id'] == row['student_id']]['full_name'].values
    student_name = student_name[0] if len(student_name) else 'unknown'

    exp_label = 'ECG' if row['experiment_id'] == '08b22dd2-dc22-42c1-a560-96415f9823ff' else 'EMG'

    recs.append({
        'student_name'          : student_name,
        'student_id'            : row['student_id'],
        'experiment'            : exp_label,
        'last_attempt'          : int(orig_row['attempt_number']),
        'pre_test_score'        : round(float(orig_row['pre_test_score']), 1),
        'post_test_score'       : round(float(orig_row['post_test_score']), 1),
        'learning_gain'         : round(float(orig_row['learning_gain']), 2),
        'normalized_gain'       : round(float(orig_row['normalized_gain']), 3)
                                  if pd.notna(orig_row['normalized_gain']) else None,
        'neural_predicted_post' : round(pred_post, 1),
        'sym_mastery'           : ['novice','beginner','intermediate','expert'][int(row['sym_mastery'])],
        'sym_struggle'          : bool(row['sym_struggle']),
        'sym_hint_dependent'    : bool(row['sym_hint_dependent']),
        'sym_speed_learner'     : bool(row['sym_speed_learner']),
        'sym_disengaged'        : bool(row['sym_disengaged']),
        'recommended_difficulty': diff_map[sym_rec],
        'personalised_advice'   : (
            "Increase challenge — high mastery detected."  if sym_rec == 2 else
            "Offer hints and scaffolding — student struggles."  if row['sym_struggle'] else
            "Student is hint-dependent — try hint-free mode."   if row['sym_hint_dependent'] else
            "Engaged and progressing — maintain current level."
        ),
    })

recs_df = pd.DataFrame(recs).sort_values('student_name')
recs_df.to_csv('/home/claude/personalised_recommendations.csv', index=False)

print(f"  Generated {len(recs_df)} personalised recommendations")
print("\n  Sample recommendations:")
print(recs_df[['student_name','experiment','sym_mastery','sym_struggle',
               'recommended_difficulty','personalised_advice']].head(10).to_string(index=False))

# ── 9. SUMMARY ────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 9 — Summary")
print("=" * 60)
print(f"  Best validation MAE        : {best_val:.3f} points")
print(f"  Students personalised      : {recs_df['student_id'].nunique()}")
print(f"  Difficulty: increase       : {(recs_df['recommended_difficulty']=='increase').sum()}")
print(f"  Difficulty: maintain       : {(recs_df['recommended_difficulty']=='maintain').sum()}")
print(f"  Difficulty: decrease       : {(recs_df['recommended_difficulty']=='decrease').sum()}")
print(f"  Students struggling        : {recs_df['sym_struggle'].sum()}")
print(f"  Hint-dependent students    : {recs_df['sym_hint_dependent'].sum()}")
print(f"\n  Outputs saved:")
print(f"    /home/claude/personalised_recommendations.csv")
print(f"    /home/claude/neurosym_model.pt")
print("=" * 60)
