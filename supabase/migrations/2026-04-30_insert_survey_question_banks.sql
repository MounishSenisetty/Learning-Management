-- Migration: insert default survey question banks for ECG and EMG
-- Generated: 2026-04-30

insert into question_banks (experiment_type, module, questions, metadata, updated_at, created_at)
values
('ECG', 'survey', 
  (
    select jsonb_pretty(to_jsonb(qs)) from (
      select array_to_json(array_agg(t)) as qs from (
        select id, section, text, options, answerindex as "answerIndex" from (
          values
            ('ecg-survey-pu-1'::text, 'analysis'::text, 'Using this learning technology improves my learning effectiveness.'::text, array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 3),
            ('ecg-survey-pu-2', 'analysis', 'This tool increases my learning productivity.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 3),
            ('ecg-survey-peou-1', 'analysis', 'Learning to use this tool was easy for me.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 3),
            ('ecg-survey-atu-1', 'analysis', 'I like using this learning technology.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 3),
            ('ecg-survey-bi-1', 'analysis', 'I intend to use this tool in the future.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 3),
            ('ecg-survey-oer-1', 'analysis', 'I am familiar with OER materials available for this subject.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('ecg-survey-oer-2', 'analysis', 'OER materials for this topic are high quality.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('ecg-survey-oer-3', 'analysis', 'I am willing to adapt OER materials for my own learning.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 3),
            ('ecg-survey-oer-4', 'analysis', 'I understand the licensing (e.g., CC BY) of OER I use.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('ecg-survey-oer-5', 'analysis', 'Lack of time prevents me from finding/adapting OER.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 3),
            ('ecg-survey-open-1', 'analysis', 'What OER sources do you use? (free text)', array['Open response'], 0),
            ('ecg-survey-open-2', 'analysis', 'What are the main barriers to using/adapting OER? (free text)', array['Open response'], 0)
        ) as s(id, section, text, options, answerindex)
      ) t
    ) as j
  ),
  json_build_object('instrument_id', 'TAM-OER-001', 'version', '1.0', 'scale', '5-point', 'anchors', json_build_object('1','Strongly disagree','5','Strongly agree')), now(), now()
)
on conflict (experiment_type, module) do update set questions = excluded.questions, metadata = excluded.metadata, updated_at = now();

insert into question_banks (experiment_type, module, questions, metadata, updated_at, created_at)
values
('EMG', 'survey', 
  (
    select jsonb_pretty(to_jsonb(qs)) from (
      select array_to_json(array_agg(t)) as qs from (
        select id, section, text, options, answerindex as "answerIndex" from (
          values
            ('emg-survey-pu-1'::text, 'analysis'::text, 'Using this learning technology improves my learning effectiveness.'::text, array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-pu-2', 'analysis', 'This tool increases my learning productivity.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-peou-1', 'analysis', 'Learning to use this tool was easy for me.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-atu-1', 'analysis', 'I like using this learning technology.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-bi-1', 'analysis', 'I intend to use this tool in the future.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-oer-1', 'analysis', 'I am familiar with OER materials available for this subject.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-oer-2', 'analysis', 'OER materials for this topic are high quality.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-oer-3', 'analysis', 'I am willing to adapt OER materials for my own learning.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-oer-4', 'analysis', 'I understand the licensing (e.g., CC BY) of OER I use.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-oer-5', 'analysis', 'Lack of time prevents me from finding/adapting OER.', array['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], 2),
            ('emg-survey-open-1', 'analysis', 'What OER sources do you use? (free text)', array['Open response'], 0),
            ('emg-survey-open-2', 'analysis', 'What are the main barriers to using/adapting OER? (free text)', array['Open response'], 0)
        ) as s(id, section, text, options, answerindex)
      ) t
    ) as j
  ),
  json_build_object('instrument_id', 'TAM-OER-001', 'version', '1.0', 'scale', '5-point', 'anchors', json_build_object('1','Strongly disagree','5','Strongly agree')), now(), now()
)
on conflict (experiment_type, module) do update set questions = excluded.questions, metadata = excluded.metadata, updated_at = now();
