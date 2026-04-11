# Learning Analytics Platform (EMG + ECG)

A Next.js + Supabase learning analytics platform for simulation-based education research.

## Features

- Student onboarding and unique tracking by roll number
- Pre-test -> simulation -> post-test -> survey workflow
- Multi-attempt support with improvement analysis
- EMG and ECG simulation embedding from legacy lab modules
- Analytics API and dashboard for student or cohort-level analysis
- Research-oriented metrics: learning gain, normalized gain, efficiency, time improvement

## Tech Stack

- Next.js (App Router, TypeScript)
- React + Tailwind CSS
- Supabase PostgreSQL
- Recharts for dashboard visualizations

## Quick Start

1. Install dependencies
   - npm install
2. Configure environment
   - copy .env.example to .env.local
3. Create database schema
   - Run SQL in supabase/schema.sql in the Supabase SQL editor
4. Start app
   - npm run dev

## Core Routes

- /login
- /experiments
- /pre-test/ECG and /pre-test/EMG
- /simulation/ECG and /simulation/EMG
- /post-test/ECG and /post-test/EMG
- /survey/new
- /dashboard

## API Routes

- POST /api/students
- POST /api/attempts
- GET /api/students/:id/history
- GET /api/analytics/overview
- GET /api/analytics/student/:id

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project into Vercel.
3. Add environment variables from .env.example.
4. Deploy.

## Research Metrics

- learning_gain = post_test_score - pre_test_score
- normalized_gain = (post_test_score - pre_test_score) / (100 - pre_test_score)
- efficiency = learning_gain / time_taken_seconds
- time_improvement = attempt1_time - attempt2_time

## Notes

Legacy static labs are served from:

- /labs/ECG/index.html
- /labs/EMG/index.html
