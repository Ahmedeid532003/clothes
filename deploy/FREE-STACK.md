# Deploy checklist — Netlify + Koyeb + Neon (100% free tier)

See Arabic guide: `release/نفّذ-بالترتيب.txt`

## Quick links

- Neon DB: https://neon.tech
- Koyeb API: https://app.koyeb.com
- Netlify UI: https://app.netlify.com
- GitHub repo: https://github.com/Ahmedeid532003/clothes

## After deploy — set on Netlify (Build env)

```
VITE_API_URL=https://<your-app>.koyeb.app/api/v1
```

## After deploy — set on Koyeb

```
CORS_ALLOWED_ORIGINS=https://<your-site>.netlify.app
CSRF_TRUSTED_ORIGINS=https://<your-site>.netlify.app
```
