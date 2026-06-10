# Yoduku

Yoduku is a daily browser path puzzle. The site is vanilla HTML, CSS, and ES
modules, with deterministic daily puzzle generation and no build step.

## Local Development

Run the test suite:

```sh
npm test
```

Serve the static site locally:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Vercel Deployment

The app deploys as a static site from the repository root.

1. Create a Vercel project for this repository.
2. Use framework preset `Other`.
3. Leave the build command blank. `vercel.json` also sets `buildCommand` to
   `null`.
4. Use `.` as the output directory.
5. Run `npm test` before promoting a deployment.

Optional CLI flow:

```sh
npm test
vercel
vercel --prod
```

Vercel will create a local `.vercel` directory when linked; it is ignored by
git.

## Supabase Setup

Accounts and the leaderboard are optional at runtime. Without Supabase
configuration the game continues to use local storage only.

Configure these Vercel environment variables before enabling accounts:

```sh
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
```

Expose the public browser config by editing `js/env.js`, which sets
`window.YODUKU_CONFIG` before `js/main.js` loads:

```js
window.YODUKU_CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-public-anon-key',
};
```

The service-role key is only for Vercel API functions. Never expose it in
browser JavaScript.

Apply the SQL in `supabase/schema.sql` to create profiles, synced progress,
stats, and daily leaderboard tables with row-level security policies.
