-- TAM survey database update
-- Adds TAM survey storage tables and refreshes the survey question bank rows.

create table if not exists tam_survey_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  experiment_type text not null check (experiment_type in ('EMG', 'ECG')),
  instrument_id text not null default 'TAM-001',
  instrument_version text not null default '1.0',
  feedback_text text,
  created_at timestamptz not null default now(),
  unique (attempt_id)
);

alter table tam_survey_responses add column if not exists student_id uuid references students(id) on delete cascade;

update tam_survey_responses tsr
set student_id = a.student_id
from attempts a
where tsr.attempt_id = a.id
  and tsr.student_id is null;

create index if not exists idx_tam_survey_attempt on tam_survey_responses(attempt_id);
create index if not exists idx_tam_survey_student on tam_survey_responses(student_id);

create table if not exists tam_survey_item_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  experiment_type text not null check (experiment_type in ('EMG', 'ECG')),
  question_id text not null,
  construct text not null check (construct in ('PU', 'PEOU', 'ATU', 'BI')),
  answer_index smallint not null check (answer_index between 1 and 5),
  answer_text text not null,
  instrument_id text not null default 'TAM-001',
  instrument_version text not null default '1.0',
  is_reverse_scored boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tam_survey_item_responses add column if not exists student_id uuid references students(id) on delete cascade;

update tam_survey_item_responses tsir
set student_id = a.student_id
from attempts a
where tsir.attempt_id = a.id
  and tsir.student_id is null;

create index if not exists idx_tam_survey_item_attempt on tam_survey_item_responses(attempt_id);
create index if not exists idx_tam_survey_item_student on tam_survey_item_responses(student_id);
create index if not exists idx_tam_survey_item_question on tam_survey_item_responses(question_id);
create index if not exists idx_tam_survey_item_construct on tam_survey_item_responses(construct);

drop trigger if exists trg_tam_survey_sync_student on tam_survey_responses;
create trigger trg_tam_survey_sync_student
before insert or update on tam_survey_responses
for each row
execute function sync_student_from_attempt();

drop trigger if exists trg_tam_survey_item_sync_student on tam_survey_item_responses;
create trigger trg_tam_survey_item_sync_student
before insert or update on tam_survey_item_responses
for each row
execute function sync_student_from_attempt();

delete from question_banks where module = 'survey';

insert into question_banks (experiment_type, module, questions, metadata, updated_at, created_at)
values
(
  'ECG',
  'survey',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'ecg-survey-pu-1',
      'section', 'analysis',
      'text', 'Using this learning technology would improve my learning performance.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-pu-2',
      'section', 'analysis',
      'text', 'This tool would help me learn the material more effectively.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-pu-3',
      'section', 'analysis',
      'text', 'Using this technology would increase my productivity in learning.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-peou-1',
      'section', 'analysis',
      'text', 'Learning to use this tool would be easy for me.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-peou-2',
      'section', 'analysis',
      'text', 'I would find this technology easy to use.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-peou-3',
      'section', 'analysis',
      'text', 'Interacting with this tool would not be frustrating.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-atu-1',
      'section', 'analysis',
      'text', 'I have a favorable attitude toward using this learning technology.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-atu-2',
      'section', 'analysis',
      'text', 'Using this tool in my learning would be a good idea.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-bi-1',
      'section', 'analysis',
      'text', 'I intend to use this learning technology in the future.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'ecg-survey-bi-2',
      'section', 'analysis',
      'text', 'I would recommend this tool to other students.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    )
  ),
  jsonb_build_object(
    'instrument_id', 'TAM-001',
    'version', '1.0',
    'scale', '5-point',
    'anchors', jsonb_build_object(
      '1', 'Strongly disagree',
      '2', 'Disagree',
      '3', 'Neutral',
      '4', 'Agree',
      '5', 'Strongly agree'
    )
  ),
  now(),
  now()
),
(
  'EMG',
  'survey',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'emg-survey-pu-1',
      'section', 'analysis',
      'text', 'Using this learning technology would improve my learning performance.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-pu-2',
      'section', 'analysis',
      'text', 'This tool would help me learn the material more effectively.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-pu-3',
      'section', 'analysis',
      'text', 'Using this technology would increase my productivity in learning.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-peou-1',
      'section', 'analysis',
      'text', 'Learning to use this tool would be easy for me.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-peou-2',
      'section', 'analysis',
      'text', 'I would find this technology easy to use.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-peou-3',
      'section', 'analysis',
      'text', 'Interacting with this tool would not be frustrating.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-atu-1',
      'section', 'analysis',
      'text', 'I have a favorable attitude toward using this learning technology.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-atu-2',
      'section', 'analysis',
      'text', 'Using this tool in my learning would be a good idea.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-bi-1',
      'section', 'analysis',
      'text', 'I intend to use this learning technology in the future.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    ),
    jsonb_build_object(
      'id', 'emg-survey-bi-2',
      'section', 'analysis',
      'text', 'I would recommend this tool to other students.',
      'options', jsonb_build_array('Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'),
      'answerIndex', 3
    )
  ),
  jsonb_build_object(
    'instrument_id', 'TAM-001',
    'version', '1.0',
    'scale', '5-point',
    'anchors', jsonb_build_object(
      '1', 'Strongly disagree',
      '2', 'Disagree',
      '3', 'Neutral',
      '4', 'Agree',
      '5', 'Strongly agree'
    )
  ),
  now(),
  now()
)
on conflict (experiment_type, module) do update
set questions = excluded.questions,
    metadata = excluded.metadata,
    updated_at = now();
