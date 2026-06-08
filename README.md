# Orbiit

Orbiit is a React and Supabase app for student social matching, date planning, event matching, venue voting, waitlists, and admin operations.

The web app is built with Vite, React, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query, and Supabase. The repo also contains Supabase Edge Functions, database migrations, email templates, and Capacitor iOS/Android shells.

## Quick Start

Install dependencies:

```sh
npm install
```

Create or update a local override file named `.env.local` if you need local Supabase values:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-or-anon-key>
```

Run the app:

```sh
npm run dev
```

The Vite dev server runs on port `8080`. To test from a phone or another device on the same network:

```sh
npm run dev -- --host
```

## Common Commands

```sh
npm run dev          # start the local Vite dev server
npm run build        # production build
npm run build:dev    # development-mode build
npm run preview      # preview the built app locally
npm run lint         # run ESLint
npm run gen-types    # regenerate Supabase database types
```

Utility scripts:

```sh
npm run email:test-all-templates
npm run regenerate:compatibility
```

## Project Layout

```txt
src/
  components/       Shared UI, feature components, and admin UI
  components/ui/    shadcn/ui primitives
  hooks/            React hooks and admin data hooks
  integrations/     Generated Supabase client and database types
  lib/              App utilities and domain helpers
  pages/            Route-level React pages
supabase/
  functions/        Supabase Edge Functions
  migrations/       Database migrations and seed data
  sql_scripts/      One-off operational SQL scripts
public/             Static public assets
uncompressed_assets Source media assets
ios/                Capacitor iOS project
android/            Capacitor Android project
```

## Main Routes

The React routes are defined in `src/App.tsx`.

- `/` landing page
- `/auth`, `/auth/confirm`, `/change-password`
- `/profile-setup`, `/profile`
- `/questionnaire-intro`, `/questionnaire/:type?`
- `/matches`
- `/dates`, `/dates/:id`
- `/event`, `/events`, `/events/:slug`
- `/partner-venues`, `/event-curation`, `/switzerland-waitlist`
- `/admin`
- `/about`, `/terms`

## Supabase

The frontend Supabase client lives in `src/integrations/supabase/client.ts` and uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Database types are generated into `src/integrations/supabase/types.ts`:

```sh
npm run gen-types
```

The Supabase project config is in `supabase/config.toml`. Edge Functions live under `supabase/functions/`; several cron/admin functions intentionally disable JWT verification and should be protected by internal checks such as `X-Cron-Secret`.

Function secrets used across the repo include:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `OPENAI_API_KEY`
- `BEFORE_USER_CREATED_HOOK_SECRET`

Set function secrets through the Supabase CLI or dashboard. Do not commit secret values.

## Email Templates

Transactional email templates are stored in:

```txt
supabase/functions/send-user-emails/_templates/
```

Use this command to exercise all templates locally:

```sh
npm run email:test-all-templates
```

## Mobile Builds

Capacitor is configured in `capacitor.config.ts` with `webDir: "dist"`.

Build and sync the native shells:

```sh
npm run build
npx cap sync
```

Open a native project:

```sh
npx cap open ios
npx cap open android
```

## Deployment

The app is an SPA. Both `netlify.toml` and `vercel.json` rewrite all routes to `index.html` so client-side routing works after refresh.

Build command:

```sh
npm run build
```

Publish directory:

```txt
dist
```

## Branch Workflow

Sync your fork with the shared repo:

```sh
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

Create a branch for AI or feature work:

```sh
git checkout -b ai/navbar-refresh
```

Use the `dev` branch for preview deployments:

```sh
git checkout -b dev
```

## Security Notes

- Keep secrets in untracked local environment files or Supabase secrets only. Vite variables prefixed with `VITE_` are bundled into the client and must be treated as public.
- Do not edit generated Supabase files by hand unless the generator output is unavailable.
- Be careful with admin and cron functions; confirm auth and `CRON_SECRET` behavior before deployment.
- Avoid logging passwords, tokens, API keys, or personal user data.
