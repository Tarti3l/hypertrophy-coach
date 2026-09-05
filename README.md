# Hypertrophy Coach

Mobile freemium app for teaching absolute beginners the fundamentals of muscle gain. The repository currently implements Module 1 (onboarding and macro estimate), Module 2 (training theory, warm-up, exercise variants, and visual-dictionary mock integration), Module 3 (set tracking, local session history, streaks, and progress visualization), Module 4 (nutrition education, daily macro dashboard, and hydration tracking), plus Modules 5 and 6 unified in a recovery experience for sleep and red-flag education.

## Architecture

| Layer | Recommendation | Responsibility |
| --- | --- | --- |
| Mobile frontend | Expo SDK 57, React Native, TypeScript, Expo Router | Native iOS/Android UI, local-first state, notifications, accessibility |
| Client state | Zustand + TanStack Query | Form/session state and cached remote data; Module 1 persists only its completed profile locally |
| Backend | Supabase Auth, Postgres, Storage, Edge Functions | Auth, row-level security, relational data, media delivery, trusted jobs |
| Database | PostgreSQL (Supabase) | User-owned logs, programs, exercise catalogue, entitlements metadata |
| Product services | Expo Notifications + RevenueCat (later) | Smart reminders and cross-store subscription entitlement validation |
| Observability | Sentry + PostHog (later) | Crash reporting and privacy-reviewed product events |

Expo is a pragmatic choice because it keeps one TypeScript/React Native codebase for iOS and Android, while Supabase provides Postgres and row-level security for user-owned data. Use `npx create-expo-app@latest` / `npx expo install` to resolve SDK-compatible package versions whenever the scaffold is upgraded. [Expo documentation](https://docs.expo.dev/get-started/create-a-project/) [Supabase Expo guide](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)

### First-module boundary

The onboarding UI is deliberately local-first. It writes a versioned JSON document to device storage, so its UX can be tested before authentication and Supabase credentials exist. After sign-in, a sync adapter will upsert the same canonical shape to `user_profiles`.

### Macro estimate policy

The calculation uses Mifflin–St Jeor for an estimated basal metabolic rate, a conservative activity multiplier based on self-reported weekly training days, and a modest 200 kcal hypertrophy surplus. Protein starts at 1.8 g/kg, fats at 0.8 g/kg, and the remaining calories are carbohydrates. It is an educational starting estimate and must be adjusted with a qualified professional when relevant.

## Project layout

```text
.
├── apps/
│   ├── mobile/                         # Expo / React Native app
│   │   ├── app/                        # Expo Router entry and navigation
│   │   └── src/
│   │       ├── components/             # Shared presentation components
│   │       ├── features/
│   │       │   ├── onboarding/         # Module 1 — implemented
│   │       │   ├── training/           # Module 2 — implemented
│   │       │   ├── progress/           # Module 3 — implemented
│   │       │   ├── nutrition/          # Module 4 — implemented
│   │       │   ├── recovery/           # Modules 5 and 6 — implemented
│   │       │   ├── red-flags/          # Superseded by recovery/
│   │       │   ├── notifications/      # retention infrastructure — reserved
│   │       │   └── subscription/       # freemium entitlement — reserved
│   │       ├── theme/                  # Semantic visual tokens
│   │       └── utils/                  # Pure shared helpers
│   └── api/                            # Optional custom BFF / webhooks, later
├── packages/
│   ├── contracts/                      # Shared domain types and DTOs
│   ├── ui/                             # Reusable UI primitives, later
│   └── config/                         # Shared lint/TS configuration, later
├── supabase/
│   └── migrations/                     # Database schema and RLS policies
├── docs/
│   └── data-models.md                  # Canonical model reference
└── .github/workflows/                  # CI, later
```

## Run the mobile module

```bash
pnpm install
pnpm --filter @hypertrophy/mobile start
```

Before a production build, install package versions with `npx expo install` from `apps/mobile`, configure Supabase environment variables, and run the migration in `supabase/migrations`.

## Next milestones

1. Smart notifications, remote exercise media, and subscription entitlement.
2. Production Supabase sync and content operations.
