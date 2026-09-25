# Free Render Deployment Guide

## Quick Start (5 minutes)

### Prerequisites
- GitHub account with this repo
- Docker Desktop installed (for local testing)
- Render account (free at render.com)

---

## One-Click Deploy (Recommended)

1. **Fork this repo** to your GitHub
2. **Go to Render Dashboard** → New → Blueprint
3. **Connect your fork** → Render will auto-detect `render.yaml`
4. **Click "Apply"** → Render creates all 4 services automatically

That's it! Render will:
- ✅ Create PostgreSQL database (free 90 days)
- ✅ Create Redis instance (free)
- ✅ Build & deploy API as Docker container (free tier)
- ✅ Build & deploy React frontend as Static Site (free)
- ✅ Wire all environment variables automatically
- ✅ Set up health checks and auto-deploys

---

## Manual Setup (if you prefer)

### 1. Create Database (PostgreSQL)
```
Render Dashboard → New → PostgreSQL
- Name: saas-pm-db
- Plan: Free (90 days free, then $7/mo)
- Region: Oregon (or closest to you)
- Database: saas_pm
- User: saas_user
```

### 2. Create Redis
```
Render Dashboard → New → Redis
- Name: saas-pm-redis
- Plan: Free
- Region: Same as database
```

### 3. Create Backend API (Web Service)
```
Render Dashboard → New → Web Service
- Connect your GitHub repo
- Runtime: Docker
- Dockerfile: src/SaaSProjectManager.API/Dockerfile
- Context: . (repo root)
- Plan: Free
- Health Check: /health
```

**Environment Variables (set in Render dashboard):**
```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<from database "Internal Connection String">
Jwt__Secret=<generate 64-char: openssl rand -base64 64>
Jwt__Issuer=SaaSProjectManager
Jwt__Audience=SaaSProjectManager.Client
Jwt__AccessTokenMinutes=60
Frontend__Url=https://<your-frontend>.onrender.com
Redis__Connection=<from redis "Internal Connection String">
ConnectionStrings__Redis=<same as above>
Render__FrontendUrl=https://<your-frontend>.onrender.com
```

### 4. Create Frontend (Static Site)
```
Render Dashboard → New → Static Site
- Connect same GitHub repo
- Root Directory: frontend/saas-project-manager-web
- Build Command: npm ci && npm run build
- Publish Directory: dist
- Build Filter: frontend/saas-project-manager-web/**/*
```

**Environment Variables:**
```
VITE_API_URL=https://<your-api>.onrender.com
```

---

## Local Testing with Docker

```bash
# Build API image
docker build -t saas-pm-api -f src/SaaSProjectManager.API/Dockerfile .

# Run locally (needs local Postgres + Redis)
docker run -d \
  -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e "ConnectionStrings__DefaultConnection=Host=host.docker.internal;Database=saas_pm_dev;Username=postgres;Password=postgres" \
  -e "Jwt__Secret=dev-super-secret-key-change-in-production-min-32-chars!!" \
  -e "Jwt__Issuer=SaaSProjectManager" \
  -e "Jwt__Audience=SaaSProjectManager.Client" \
  -e "Frontend__Url=http://localhost:5173" \
  -e "Redis__Connection=host.docker.internal:6379" \
  saas-pm-api

# Test health
curl http://localhost:8080/health
```

---

## Free Tier Limits & Workarounds

| Resource | Free Tier Limit | Workaround |
|----------|-----------------|------------|
| Web Service | Spins down after 15 min inactivity | Use cron-job.org to ping `/health` every 10 min |
| PostgreSQL | 90 days free, then $7/mo | Migrate to Neon/Supabase free tier before expiry |
| Redis | 25 MB, 30 connections | Sufficient for dev/small apps |
| Static Site | Unlimited, always free | ✅ No limits |
| Bandwidth | 100 GB/mo | Sufficient for most apps |

### Keep-Alive Cron (prevent spin-down)
```bash
# Add to crontab or use cron-job.org
*/10 * * * * curl -s https://your-api.onrender.com/health > /dev/null
```

---

## Post-Deploy Checklist

- [ ] API `/health` returns 200
- [ ] Swagger UI loads at `/swagger`
- [ ] Register new user works
- [ ] Login returns JWT token
- [ ] Create organization works
- [ ] Create project works
- [ ] Kanban board loads
- [ ] Real-time updates work (SignalR)
- [ ] Frontend loads at `https://your-app.onrender.com`
- [ ] API calls from frontend work (CORS OK)
- [ ] WebSocket connections work (check browser devtools)

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `502 Bad Gateway` | Check logs: usually missing env var or port mismatch (Render uses PORT env var) |
| CORS errors | Ensure `Frontend__Url` and `Render__FrontendUrl` match exactly (including `https://`) |
| DB connection failed | Use **Internal Connection String** from Render dashboard, not external |
| Build fails | Check Node 20+ and .NET 8 SDK versions |
| Migrations not applied | Run `dotnet ef database update` in Render Shell tab |
| WebSocket fails | Ensure `wss://` in frontend, Render proxies WebSocket automatically |

---

## Security Notes

- **Never commit real secrets** - Use Render dashboard env vars only
- **JWT Secret**: Generate 64+ chars: `openssl rand -base64 64`
- **Database**: Render provides internal URLs (not publicly accessible)
- **HTTPS**: Render provides automatically
- **Secrets rotation**: Update in Render dashboard, redeploy

---

## Cost Summary (After Free Tier)

| Service | Free Period | Then |
|---------|-------------|------|
| Web Service | Always free (with spin-down) | $7/mo for always-on |
| Static Site | Forever free | Always free |
| PostgreSQL | 90 days free | $7/mo |
| Redis | Forever free (25MB) | $7/mo for more |

**Estimated after 90 days: ~$14/mo** (or migrate DB to Neon/Supabase free tier)

---

## Useful Commands

```bash
# View Render logs
render logs -s saas-pm-api -t web

# Run migration in Render Shell
dotnet ef database update

# Local Docker compose for full stack
docker-compose -f docker-compose.yml up -d

# Generate JWT secret
openssl rand -base64 64
```

---

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- This project issues: GitHub Issues