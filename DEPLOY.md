# Deploying PickleRank

Recommended production setup:

- Frontend: Vercel
- Backend API: Render Web Service
- Database: Render Postgres

This keeps the frontend cheap and simple while avoiding VPS/database ops work.

## 1. Prepare secrets

Before deploying, decide these values:

- `PICKLERANK_ADMIN_PASSWORD`
- `PICKLERANK_AUTH_TOKEN_SECRET`

Use a long random secret for the token secret.

## 2. Deploy the backend to Render

The repo includes [render.yaml](/Users/michael/Documents/chatgpt/picklerank/render.yaml:1), so you can use Render Blueprint deploy.

### Render steps

1. Push the repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select the repo.
4. Render will detect:
   - web service `picklerank-api`
   - Postgres database `picklerank-db`
5. Set these environment variables on the web service:
   - `PICKLERANK_CORS_ORIGINS`
   - `PICKLERANK_ADMIN_PASSWORD`
   - `PICKLERANK_AUTH_COOKIE_SECURE`
   - `PICKLERANK_AUTH_COOKIE_SAMESITE`

For `PICKLERANK_CORS_ORIGINS`, use your Vercel frontend URLs as a comma-separated string, for example:

```text
https://picklerank.vercel.app,https://picklerank-git-main-yourteam.vercel.app
```

For cross-site Vercel -> Render admin login cookies, set:

```text
PICKLERANK_AUTH_COOKIE_SECURE=true
PICKLERANK_AUTH_COOKIE_SAMESITE=none
```

Render will inject `DATABASE_URL` automatically from the managed Postgres instance.

### Backend behavior on Render

- build command: `pip install -e ".[dev]"`
- start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- health check: `/health`

After deploy, note the backend URL, for example:

```text
https://picklerank-api.onrender.com
```

## 3. Deploy the frontend to Vercel

### Vercel steps

1. Import the same GitHub repo into Vercel.
2. Set the project root directory to `frontend`.
3. Set this environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-render-api.onrender.com
```

4. Deploy.

After deploy, note the production URL, for example:

```text
https://picklerank.vercel.app
```

## 4. Update backend CORS

Once the Vercel URL is known, update the Render backend env var:

```text
PICKLERANK_CORS_ORIGINS=https://picklerank.vercel.app
```

If you want preview deployments to work too, include both production and preview domains:

```text
https://picklerank.vercel.app,https://picklerank-git-main-yourteam.vercel.app
```

Redeploy the backend after changing CORS values.

## 5. Smoke test production

Check these:

- `GET https://your-render-api.onrender.com/health`
- open the Vercel frontend
- confirm dashboard loads
- confirm anonymous users can only view
- confirm admin login works
- confirm admin can create a player/session/match

## Notes

- Render free database tiers may have limits or lifecycle restrictions. For a real ongoing app, use a paid Render Postgres tier.
- Vercel Hobby is free for the frontend as of May 25, 2026.
- Render web services start from `$7/month`, and Render Postgres paid plans start from `$6/month` according to current pricing.

Sources:

- https://vercel.com/pricing
- https://render.com/pricing
