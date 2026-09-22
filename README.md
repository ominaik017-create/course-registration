# Course Registration System

A small, plain HTML/CSS/JS app (no build step, no framework) backed by Supabase.
Because there's no build step, it deploys the same way on every static host —
Vercel, Netlify, Render, GitHub Pages, Cloudflare Pages — with nothing to
configure beyond pointing the host at this folder.

Files:
- `index.html` — page structure
- `styles.css` — white theme
- `app.js` — all the logic (auth, course list, register, drop)
- `config.js` — the two values you fill in below
- `supabase-schema.sql` — run this once in Supabase

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name/region, set a database password, wait ~2 minutes for it to spin up.
2. In the left sidebar, open **SQL Editor** → **New query**, paste the entire contents of `supabase-schema.sql`, and click **Run**. This creates the `courses` and `registrations` tables, turns on Row Level Security, and adds 5 sample courses.
3. Go to **Authentication → Providers** and confirm **Email** is enabled (it is by default).
4. Optional but recommended for testing: **Authentication → Providers → Email** → turn **off** "Confirm email" so you can sign up and use the app immediately without checking an inbox. Turn it back on before you use this with real students.

## 2. Connect the app to your project

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key (not the `service_role` key — never put that in frontend code).
3. Open `config.js` and paste them in:

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

That's the only edit required. Everything else works as-is.

## 3. Try it locally first (optional)

Any static server works, for example:

```bash
npx serve .
```

Open the printed local URL, create an account, and confirm you can see the sample courses and register.

## 4. Deploy

Push this folder to a GitHub repo, then use whichever host you prefer. Because it's a static site with zero dependencies, none of these need a build command — that's the #1 source of deploy errors with frameworks, and this project has no build to fail.

### Vercel
1. **Add New… → Project**, import the repo.
2. Framework preset: choose **Other**.
3. Build command: leave **empty**. Output directory: leave as `.` (root).
4. Deploy.

### Netlify
1. **Add new site → Import an existing project**, pick the repo.
2. Build command: leave **empty**. Publish directory: `.` (root, or wherever `index.html` lives).
3. Deploy.

### Render
1. **New → Static Site**, connect the repo.
2. Build command: leave **empty** (or `echo "no build"` if Render requires a value).
3. Publish directory: `.`
4. Deploy.

### GitHub Pages / Cloudflare Pages
Same idea — no build command, publish the repo root.

## 5. Common errors and how this avoids them

- **"Build failed" / wrong Node version** — this project has no `package.json` and no build step, so there's nothing for the platform's Node/npm toolchain to fail on.
- **Blank page after deploy / 404 on refresh** — this is a single `index.html` with no client-side routing, so there are no extra routes that 404.
- **CORS or "Failed to fetch" errors** — Supabase's API allows requests from any origin by default for the anon key, so no allow-list configuration is needed on Supabase's side no matter which domain the host gives you.
- **"row-level security policy" errors when registering** — means you're testing while signed out, or the SQL script didn't finish running. Re-run `supabase-schema.sql` and make sure you're logged in.
- **Never commit the `service_role` key.** Only the `anon` key belongs in `config.js`; RLS policies are what keep students from reading or editing each other's data.

## How it works

- **Auth** — Supabase's built-in email/password auth. No separate backend needed.
- **Courses** — a `courses` table, exposed to students read-only through the `courses_with_seats` view, which also computes live seat counts.
- **Registrations** — a `registrations` join table. Row Level Security ensures a student can only see, insert, and delete their own rows — enforced by Supabase itself, not by the frontend.
- **Capacity** — enforced with a unique constraint (no duplicate registrations) and by hiding the register button once seats run out; the "seats_left" figure always comes fresh from the database view.

## Customizing

- Add or edit courses directly in Supabase's **Table Editor → courses**, or via SQL.
- Change colors in `styles.css` — all values are CSS variables at the top of the file under `:root`.
