# Data models

All user-owned tables must use UUIDs matching `auth.users.id`, server timestamps, and Supabase Row Level Security. Keep the exercise catalogue separate from user data; it can be public-read but only staff-write.

## `user_profiles` / User

```json
{
  "id": "uuid (auth.users.id)",
  "age": 26,
  "height_cm": 172.5,
  "weight_kg": 68.4,
  "biological_sex": "female | male | unspecified",
  "knowledge_level": "none | basic | experienced",
  "training_days_per_week": 3,
  "short_term_goal": "Entrenar tres días por semana durante ocho semanas",
  "long_term_goal": "Ganar fuerza y masa muscular de forma sostenible",
  "macro_targets": {
    "calories": 2250,
    "protein_grams": 123,
    "carbs_grams": 300,
    "fat_grams": 55,
    "formula_version": 1
  },
  "onboarding_completed_at": "2026-09-03T12:00:00Z",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

`age`, body measurements, sleep, and performance are sensitive wellness data. Collect the minimum required, encrypt in transit/at rest through the platform, document retention/deletion, and never expose data through analytics without explicit review.

## `exercises` / Exercise

```json
{
  "id": "uuid",
  "slug": "barbell-back-squat",
  "name": "Sentadilla con barra",
  "primary_muscles": ["quadriceps", "glutes"],
  "secondary_muscles": ["hamstrings", "core"],
  "equipment": "barbell",
  "difficulty": "beginner",
  "instructions": ["..."],
  "media_gif_url": "https://cdn.example/exercises/squat.gif",
  "media_video_url": "https://cdn.example/exercises/squat.mp4",
  "media_poster_url": "https://cdn.example/exercises/squat.jpg",
  "is_published": true
}
```

Store 3–5 second technique clips in Supabase Storage/CDN. Serve a poster and a compressed MP4/WebM; GIF is optional only for compatibility because it is considerably heavier.

## `workouts` / Workout and `workout_sets`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "program_id": "uuid | null",
  "started_at": "timestamp",
  "ended_at": "timestamp | null",
  "duration_minutes": 52,
  "notes": null,
  "status": "planned | in_progress | completed | skipped",
  "sets": [
    {
      "id": "uuid",
      "exercise_id": "uuid",
      "set_number": 1,
      "target_reps": 10,
      "completed_reps": 10,
      "weight_kg": 30,
      "rpe": 7,
      "completed_at": "timestamp"
    }
  ]
}
```

Sets are their own table so progression can be queried by exercise and date without denormalizing whole workouts.

## `sleep_logs` / SleepLog

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "sleep_date": "2026-09-03",
  "duration_minutes": 450,
  "quality": 4,
  "note": "Dormí bien",
  "created_at": "timestamp"
}
```

One log per user/day is enforced at the database level. The recovery dashboard can join this table with completed workouts by date without claiming medical causality.
