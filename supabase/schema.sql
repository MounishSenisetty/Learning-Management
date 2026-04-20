create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique,
  roll_number text not null,
  pin text,
  full_name text not null,
  email text unique,
  age integer check (age between 10 and 100),
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  program text,
  year_of_study integer check (year_of_study between 1 and 12),
  institution text,
  prior_lab_experience boolean,
  cohort text,
  created_at timestamptz not null default now()
);

alter table students add column if not exists age integer check (age between 10 and 100);
alter table students add column if not exists gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say'));
alter table students add column if not exists program text;
alter table students add column if not exists year_of_study integer check (year_of_study between 1 and 12);
alter table students add column if not exists institution text;
alter table students add column if not exists prior_lab_experience boolean;
alter table students add column if not exists cohort text;
alter table students add column if not exists student_code text;
alter table students add column if not exists pin text;

-- Drop old unique index on roll_number to allow multiple entries with same roll_number but different PIN
drop index if exists idx_roll_number_not_null;

-- Create unique constraint on (roll_number, pin)
alter table students add constraint if not exists uq_roll_number_pin unique (roll_number, pin);

update students
set student_code = 'STU-' || upper(substring(replace(id::text, '-', '') from 1 for 8))
where student_code is null;

create unique index if not exists idx_students_student_code_unique on students(student_code);

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  type text not null unique check (type in ('EMG', 'ECG')),
  description text,
  created_at timestamptz not null default now()
);

insert into experiments (type, description)
values
  ('EMG', 'Electromyography simulation experiment'),
  ('ECG', 'Electrocardiography simulation experiment')
on conflict (type) do nothing;

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  experiment_id uuid not null references experiments(id) on delete restrict,
  pre_test_score numeric(5,2) not null check (pre_test_score between 0 and 100),
  post_test_score numeric(5,2) not null check (post_test_score between 0 and 100),
  learning_gain numeric(6,2) generated always as (post_test_score - pre_test_score) stored,
  normalized_gain numeric(8,4) generated always as (
    case
      when pre_test_score < 100 then (post_test_score - pre_test_score) / (100 - pre_test_score)
      else null
    end
  ) stored,
  time_taken_seconds integer not null check (time_taken_seconds > 0),
  attempt_number integer not null check (attempt_number > 0),
  engagement_score numeric(5,2) check (engagement_score between 0 and 100),
  efficiency numeric(10,6) generated always as (
    case
      when time_taken_seconds > 0 then (post_test_score - pre_test_score) / time_taken_seconds
      else null
    end
  ) stored,
  retention_score numeric(5,2) check (retention_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (student_id, experiment_id, attempt_number)
);

create index if not exists idx_attempts_student on attempts(student_id);
create index if not exists idx_attempts_experiment on attempts(experiment_id);
create index if not exists idx_attempts_created_at on attempts(created_at);

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references attempts(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  understanding smallint not null check (understanding between 1 and 5),
  engagement smallint not null check (engagement between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  usability smallint not null check (usability between 1 and 5),
  confidence smallint not null check (confidence between 1 and 5),
  feedback_text text,
  created_at timestamptz not null default now()
);

alter table survey_responses add column if not exists student_id uuid references students(id) on delete cascade;

update survey_responses sr
set student_id = a.student_id
from attempts a
where sr.attempt_id = a.id
  and sr.student_id is null;

create index if not exists idx_survey_student on survey_responses(student_id);

create table if not exists interaction_events (
  id bigserial primary key,
  attempt_id uuid not null references attempts(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  event_type text not null,
  event_value jsonb,
  event_ts timestamptz not null default now()
);

alter table interaction_events add column if not exists student_id uuid references students(id) on delete cascade;

update interaction_events ie
set student_id = a.student_id
from attempts a
where ie.attempt_id = a.id
  and ie.student_id is null;

create index if not exists idx_events_attempt on interaction_events(attempt_id);
create index if not exists idx_events_student on interaction_events(student_id);

create or replace function sync_student_from_attempt()
returns trigger as $$
declare
  resolved_student uuid;
begin
  select student_id into resolved_student
  from attempts
  where id = new.attempt_id;

  if resolved_student is null then
    raise exception 'Attempt % not found or has no student mapping', new.attempt_id;
  end if;

  if new.student_id is null then
    new.student_id := resolved_student;
  elsif new.student_id <> resolved_student then
    raise exception 'student_id % does not match attempt student_id % for attempt %', new.student_id, resolved_student, new.attempt_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_survey_sync_student on survey_responses;
create trigger trg_survey_sync_student
before insert or update on survey_responses
for each row
execute function sync_student_from_attempt();

drop trigger if exists trg_events_sync_student on interaction_events;
create trigger trg_events_sync_student
before insert or update on interaction_events
for each row
execute function sync_student_from_attempt();

create or replace view v_student_attempt_summary as
select
  a.id as attempt_id,
  s.id as student_id,
  s.roll_number,
  s.full_name,
  e.type as experiment_type,
  a.attempt_number,
  a.pre_test_score,
  a.post_test_score,
  a.learning_gain,
  a.normalized_gain,
  a.efficiency,
  a.time_taken_seconds,
  a.engagement_score,
  a.retention_score,
  a.created_at
from attempts a
join students s on s.id = a.student_id
join experiments e on e.id = a.experiment_id;

create table if not exists question_banks (
  id uuid primary key default gen_random_uuid(),
  experiment_type text not null check (experiment_type in ('EMG', 'ECG')),
  module text not null check (module in ('pre-test', 'post-test')),
  questions jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (experiment_type, module)
);

create index if not exists idx_question_banks_experiment_module on question_banks(experiment_type, module);
