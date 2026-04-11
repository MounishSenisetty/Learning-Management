# Research Analysis Guide

## Tests implemented in API

- Paired t-test for pre-test vs post-test scores across attempts
- Independent t-test for learning gain comparison between ECG and EMG groups

Endpoint:

- GET /api/analytics/research

## Formula reference

- learning_gain = post - pre
- normalized_gain = (post - pre) / (100 - pre)
- efficiency = learning_gain / time_taken_seconds
- time_improvement = previous_attempt_time - current_attempt_time

## Interpretation

- Positive meanDifference in paired pre/post suggests learning improvement.
- Positive EMG-vs-ECG gain difference implies EMG larger gains; negative implies ECG larger gains.
- Use p-values and confidence intervals in your paper using exported data in Python or R for publication-quality reporting.
