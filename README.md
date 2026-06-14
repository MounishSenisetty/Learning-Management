# Learning Management — Simulation Labs & Analytics


## Project Team

This project was developed by undergraduate students of the B.Tech Artificial Intelligence and Data Science program at Amrita Vishwa Vidyapeetham, Amritapuri.

| Name                  | Roll Number      | Role                                                    |
| --------------------- | ---------------- | ------------------------------------------------------- |
| Nemali Ashrith Reddy  | AM.AI.U4AID23014 | Frontend Developer & UI/UX Designer                     |
| Sandhiya Kennedy      | AM.AI.U4AID23056 | Database Engineer & Backend Developer                   |
| Senisetty Mounish     | AM.AI.U4AID23058 | Learning Analytics & Full-Stack Developer |
| Akshay Reddy Velugati | AM.AI.U4AID23062 | Simulation Developer & System Integration Engineer      |

**Institution:** Amrita School of Computing, Amrita Vishwa Vidyapeetham, Amritapuri, Kollam, Kerala, India




Comprehensive web platform for interactive physiology labs (EMG and ECG), student assessment, telemetry collection, and analytics with an added neuro-symbolic interpretation layer for teacher insights.



## Table of contents
- Project overview
- Features
- Architecture
- Data model (important tables/views)
- Neuro-Symbolic analysis (what it is and where it lives)
- Installation & local setup
- Running the app
- Testing the APIs
- Seeding test data (SQL snippets)
- Deployment notes
- Contributing
- License

## Project overview

This repository contains a Next.js application (TypeScript + App Router) backed by Supabase (Postgres). It hosts interactive EMG and ECG lab simulations, records student attempts and interaction events, computes research metrics (learning gain, normalized gain, efficiency), and surfaces teacher-facing dashboards with both statistical summaries and symbolic interpretations of learning behavior.

## Features

- Interactive EMG and ECG simulations (legacy lab engines included under `EMG/`, `ECG/`, and `public/labs/`)
- Pre-test → Simulation → Post-test → Survey workflow with multi-attempt support
- Attempt-level telemetry: scores, time, engagement, and interaction events
- Analytics APIs and dashboards for student, cohort, and experiment-level insights
- Neuro-symbolic reasoning layer that classifies learning patterns and suggests interventions
- Teacher and admin dashboards with visualizations and tables

## Architecture

- Frontend: Next.js (React + Tailwind) for pages and components under `src/app` and `src/components`
- Backend: Next.js API routes that call Supabase to read/write data in Postgres (`src/app/api`)
- Database: Supabase Postgres with tables and views defined in `supabase/schema.sql`
- Analytics: `src/lib/analytics.ts` implements statistical metrics and the neuro-symbolic logic
- Auth: staff and student flows with session management (see `src/lib/storage.ts`)

## Important files and locations

- Analytics core: `src/lib/analytics.ts`
- Neuro-symbolic panel UI: `src/components/neuro-symbolic-panel.tsx`
- Neuro-symbolic API route: `src/app/api/analytics/neuro-symbolic/route.ts`
- Overview analytics API: `src/app/api/analytics/overview/route.ts`
- Teacher dashboard: `src/app/teacher-dashboard/page.tsx`
- Database schema: `supabase/schema.sql`

## Data model (key tables / fields)

Important tables (see `supabase/schema.sql` for full definitions):

- `students` — student profile and metadata (id, roll_number, full_name, cohort, created_at)
- `experiments` — experiment definitions (id, type).
- `attempts` — core attempt records with fields including:
  - `id` (uuid)
  - `student_id` (uuid)
  - `experiment_id` (uuid)
  - `pre_test_score` (numeric)
  - `post_test_score` (numeric)
  - `learning_gain` (numeric, default post - pre)
  - `normalized_gain` (numeric)
  - `time_taken_seconds` (integer)
  - `attempt_number` (integer)
  - `engagement_score` (numeric)
  - `efficiency` (numeric)
  - `created_at` (timestamp)
- `interaction_events` — event logs and telemetry for each attempt (event_type, event_value JSON)
- `v_student_attempt_summary` — a view used by analytics APIs to aggregate attempt-level data with student metadata

## Neuro-Symbolic analysis

This project implements a lightweight neuro-symbolic reasoning layer that:

- Classifies each student into learning patterns: `efficient`, `improving`, `struggling`, `plateau`, `engaged`, or `inconsistent`.
- Clusters students into behavioral groups (high performers, struggling learners, plateaued, engaged explorers).
- Produces `priorityInterventions` — human-readable suggestions ranked by priority.

Where to find it:

- Symbolic logic and classifiers: `src/lib/analytics.ts` (function `computeNeuroSymbolicInsights`, helpers `classifyLearningPattern` and `clusterBehaviors`).
- API: `GET /api/analytics/neuro-symbolic` → `src/app/api/analytics/neuro-symbolic/route.ts` (returns `NeuroSymbolicInsight` JSON).
- UI: `src/components/neuro-symbolic-panel.tsx` integrated into the teacher dashboard at `src/app/teacher-dashboard/page.tsx`.

Notes on behavior:

- The neuro-symbolic API reads attempt summaries from `v_student_attempt_summary` and produces an insights object. If the attempts set is empty, the UI will indicate that no data is available.
- The classifiers are implemented as deterministic rules combining numeric metrics (avg gain, avg time, engagement, and consistency) — designed to be interpretable and tweakable by educators.

## Installation & local setup

1. Clone the repo:
```bash
git clone https://github.com/MounishSenisetty/Learning-Management.git
cd Learning-Management
```
2. Install dependencies:
```bash
npm install
```
3. Create `.env.local` at the project root with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```
4. Create database schema in Supabase SQL editor with `supabase/schema.sql`.

## Running locally

Start the dev server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## Testing the APIs

- Overview analytics:
```bash
curl -sS http://localhost:3000/api/analytics/overview | jq .
```
- Neuro-symbolic insights:
```bash
curl -sS http://localhost:3000/api/analytics/neuro-symbolic | jq .
```

If the neuro-symbolic endpoint returns an empty `learningPatterns` array or the UI says "No data available yet", ensure you have attempt rows in the database.

## Seeding test data (SQL examples)

Use the Supabase SQL editor to run these snippets (replace placeholders where noted):

```sql
-- 1) create a student
INSERT INTO students (id, roll_number, full_name, email) VALUES (gen_random_uuid(), 'R100', 'Test Student', 'test@example.com') RETURNING id;

-- 2) create an experiment (EMG/ECG)
INSERT INTO experiments (id, type, description) VALUES (gen_random_uuid(), 'EMG', 'Test EMG') RETURNING id;

-- 3) create an attempt (replace <student_id> and <experiment_id> with values returned above)
INSERT INTO attempts (id, student_id, experiment_id, pre_test_score, post_test_score, time_taken_seconds, attempt_number, engagement_score, created_at)
VALUES (gen_random_uuid(), '<student_id>', '<experiment_id>', 40, 72, 180, 1, 0.85, now());

-- 4) add an interaction event for richer workflow summaries
INSERT INTO interaction_events (attempt_id, event_type, event_value, student_id) VALUES ('<attempt_id>', 'simulation_summary', jsonb_build_object('workflowDurationSeconds', 300, 'timeTakenSeconds', 180, 'engagementScore', 0.85), '<student_id>');
```

After seeding, call the neuro-symbolic API again.

## Deployment notes

- Recommended host: Vercel for Next.js; ensure environment variables are added in project settings.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret — only used server-side in admin routes (`getSupabaseAdmin()` in `src/lib/supabase.ts`).

## Development notes

- Key analytic functions are in `src/lib/analytics.ts`. If you tweak classifier thresholds, update tests and the UI descriptions.
- Use `npm run build` to validate TypeScript and production compilation.
- The neuro-symbolic logic intentionally prioritizes interpretability (symbolic rules) over opaque ML models.

## Contributing

- Fork, create a feature branch, and open a pull request. Write tests for analytic changes and keep UI changes minimal and documented.

## License

This project has no license file in the repository. Add a LICENSE (e.g., MIT) if you want public reuse.

---

If you want, I can also add a `CONTRIBUTING.md`, seed scripts, or a minimal test harness for the analytics functions. Tell me which next step you prefer.
