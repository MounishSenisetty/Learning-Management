-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  experiment_id uuid NOT NULL,
  pre_test_score numeric NOT NULL CHECK (pre_test_score >= 0::numeric AND pre_test_score <= 100::numeric),
  post_test_score numeric NOT NULL CHECK (post_test_score >= 0::numeric AND post_test_score <= 100::numeric),
  learning_gain numeric DEFAULT (post_test_score - pre_test_score),
  normalized_gain numeric DEFAULT 
CASE
    WHEN (pre_test_score < (100)::numeric) THEN ((post_test_score - pre_test_score) / ((100)::numeric - pre_test_score))
    ELSE NULL::numeric
END,
  time_taken_seconds integer NOT NULL CHECK (time_taken_seconds > 0),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  engagement_score numeric CHECK (engagement_score >= 0::numeric AND engagement_score <= 100::numeric),
  efficiency numeric DEFAULT 
CASE
    WHEN (time_taken_seconds > 0) THEN ((post_test_score - pre_test_score) / (time_taken_seconds)::numeric)
    ELSE NULL::numeric
END,
  retention_score numeric CHECK (retention_score >= 0::numeric AND retention_score <= 100::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT attempts_pkey PRIMARY KEY (id),
  CONSTRAINT attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attempts_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id)
);
CREATE TABLE public.experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE CHECK (type = ANY (ARRAY['EMG'::text, 'ECG'::text])),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT experiments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interaction_events (
  id bigint NOT NULL DEFAULT nextval('interaction_events_id_seq'::regclass),
  attempt_id uuid NOT NULL,
  event_type text NOT NULL,
  event_value jsonb,
  event_ts timestamp with time zone NOT NULL DEFAULT now(),
  student_id uuid,
  CONSTRAINT interaction_events_pkey PRIMARY KEY (id),
  CONSTRAINT interaction_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id),
  CONSTRAINT interaction_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.question_banks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  experiment_type text NOT NULL CHECK (experiment_type = ANY (ARRAY['EMG'::text, 'ECG'::text])),
  module text NOT NULL CHECK (module = ANY (ARRAY['pre-test'::text, 'post-test'::text])),
  questions jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_banks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  roll_number text NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE,
  age integer CHECK (age >= 10 AND age <= 100),
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, 'prefer_not_to_say'::text])),
  program text,
  year_of_study integer CHECK (year_of_study >= 1 AND year_of_study <= 12),
  institution text,
  prior_lab_experience boolean,
  cohort text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  pin text,
  CONSTRAINT students_pkey PRIMARY KEY (id)
);
CREATE TABLE public.survey_question_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  student_id uuid,
  experiment_type text NOT NULL CHECK (experiment_type = ANY (ARRAY['EMG'::text, 'ECG'::text])),
  module text NOT NULL CHECK (module = 'survey'::text),
  question_id text NOT NULL,
  answer_index integer,
  answer_text text,
  instrument_id text,
  instrument_version text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT survey_question_responses_pkey PRIMARY KEY (id),
  CONSTRAINT survey_question_responses_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id),
  CONSTRAINT survey_question_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL UNIQUE,
  understanding smallint NOT NULL CHECK (understanding >= 1 AND understanding <= 5),
  engagement smallint NOT NULL CHECK (engagement >= 1 AND engagement <= 5),
  difficulty smallint NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  usability smallint NOT NULL CHECK (usability >= 1 AND usability <= 5),
  confidence smallint NOT NULL CHECK (confidence >= 1 AND confidence <= 5),
  feedback_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  student_id uuid,
  CONSTRAINT survey_responses_pkey PRIMARY KEY (id),
  CONSTRAINT survey_responses_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id),
  CONSTRAINT survey_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.tam_survey_item_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  student_id uuid,
  experiment_type text NOT NULL CHECK (experiment_type = ANY (ARRAY['EMG'::text, 'ECG'::text])),
  question_id text NOT NULL,
  construct text NOT NULL CHECK (construct = ANY (ARRAY['PU'::text, 'PEOU'::text, 'ATU'::text, 'BI'::text])),
  answer_index smallint NOT NULL CHECK (answer_index >= 1 AND answer_index <= 5),
  answer_text text NOT NULL,
  instrument_id text NOT NULL DEFAULT 'TAM-001'::text,
  instrument_version text NOT NULL DEFAULT '1.0'::text,
  is_reverse_scored boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tam_survey_item_responses_pkey PRIMARY KEY (id),
  CONSTRAINT tam_survey_item_responses_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id),
  CONSTRAINT tam_survey_item_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.tam_survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL UNIQUE,
  student_id uuid,
  experiment_type text NOT NULL CHECK (experiment_type = ANY (ARRAY['EMG'::text, 'ECG'::text])),
  instrument_id text NOT NULL DEFAULT 'TAM-001'::text,
  instrument_version text NOT NULL DEFAULT '1.0'::text,
  feedback_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tam_survey_responses_pkey PRIMARY KEY (id),
  CONSTRAINT tam_survey_responses_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id),
  CONSTRAINT tam_survey_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);