# EC2 deployment (multiple `docker run`)

This repo currently runs via `docker-compose.yml`. If you want to split services across multiple EC2 instances (before moving to ECS/S3/etc), use the pattern below.

## Recommended EC2 split

- **DB EC2**: `mongo`
- **Backend EC2**: `redis`, `server-main`, `server-ws`, `server-stockfish`, `server-dbupdates`
- **Frontend EC2**: `client` (Vite dev server on `5173`)

All containers can share one env file (same contents everywhere), e.g. `/opt/chess64/app.env`. The template defaults to `localhost` so it also works when everything runs on a single machine.

## 1) Create the shared env file

On **each** EC2:

```bash
sudo mkdir -p /opt/chess64
sudo cp deploy/ec2/app.env /opt/chess64/app.env
sudo nano /opt/chess64/app.env
```

For multi-EC2, set:
- `FRONTEND_URL` to the **frontend** EC2 public IP/domain + `:5173`
- `VITE_*` URLs to the **backend** EC2 public IP/domain + ports
- `MONGODB_URL` to the **db** EC2 private IP/domain (preferred)
- `REDIS_URL` to the **backend** EC2 Redis endpoint (see below)

Note: `docker run --env-file` does **not** support quoted values; keep entries unquoted like `KEY=value`.

## 2) DB EC2 commands (mongo)

```bash
docker volume create mongo64

docker run -d --name chess64-mongo --restart unless-stopped \
  -p 27017:27017 -v mongo64:/data/db \
  mongo:7
```

## 3) Backend EC2 commands (redis + 4 processes from one image)

Create a shared Docker network so the backend containers can reach Redis by container name:

```bash
docker network create chess64 || true
```

Run Redis:

```bash
docker run -d --name chess64-redis --restart unless-stopped \
  --network chess64 \
  -p 6379:6379 \
  redis:7-alpine
```

Set `REDIS_URL` in `/opt/chess64/app.env` to:

```bash
REDIS_URL=redis://chess64-redis:6379
```

Build once:

```bash
docker build -t chess64-server:latest ./server
```

Run:

```bash
docker run -d --name chess64-server-main --restart unless-stopped \
  --network chess64 \
  --env-file /opt/chess64/app.env \
  -e PORT=8080 -p 8080:8080 \
  chess64-server:latest \
  npm run start:main

docker run -d --name chess64-server-ws --restart unless-stopped \
  --network chess64 \
  --env-file /opt/chess64/app.env \
  -e PORT=9090 -p 9090:9090 \
  chess64-server:latest \
  npm run start:ws

docker run -d --name chess64-server-stockfish --restart unless-stopped \
  --network chess64 \
  --env-file /opt/chess64/app.env \
  -e PORT=8081 -p 8081:8081 \
  chess64-server:latest \
  npm run start:stockfish

# databaseUpdation.js listens on 9191 internally (hardcoded), no PORT env needed.
docker run -d --name chess64-server-dbupdates --restart unless-stopped \
  --network chess64 \
  --env-file /opt/chess64/app.env \
  -p 9191:9191 \
  chess64-server:latest \
  npm run start:microservice:dbupdates
```

## 4) Frontend EC2 commands (Vite dev server)

```bash
docker build -t chess64-client:latest ./client

docker run -d --name chess64-client --restart unless-stopped \
  --env-file /opt/chess64/app.env \
  -p 5173:5173 \
  chess64-client:latest
```

## 5) Ports / security groups (minimum)

- Public: `5173`, `8080`, `9090`, `8081`
- Private/VPC-only: `27017`, `6379` (strongly recommended)
- `9191`: expose only if you actually need it externally

## 6) Useful checks

```bash
docker ps
docker logs -f chess64-server-main
docker logs -f chess64-client
```
