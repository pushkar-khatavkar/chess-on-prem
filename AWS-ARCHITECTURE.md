# AWS Serverless Re-Architecture — Chess64

This document maps every component of the current on-prem / single-EC2 Docker Compose stack to managed AWS services. The goal is to eliminate self-managed infrastructure while preserving the real-time WebSocket behaviour, pub/sub game-event pipeline, and Stockfish AI integration.

---

## Current Architecture (Docker Compose baseline)

| Container | Role | Port |
|---|---|---|
| `chess64-client` | React/Vite SPA | 5173 |
| `chess64-server-main` | HTTP API + matchmaking Socket.IO | 8080 |
| `chess64-server-ws` | Real-time game Socket.IO | 9090 |
| `chess64-server-stockfish` | Stockfish AI Socket.IO | 8081 |
| `chess64-server-dbupdates` | Redis pub/sub → MongoDB write + Elo update | 9191 |
| `chess64-mongo` | MongoDB 7 | 27017 |
| `chess64-redis` | Redis 7 (cache + pub/sub + queue) | 6379 |

**Data flow summary**

```
Browser ──HTTP──▶ main-server ──Redis pub/sub──▶ ws-server (game:new)
                              ──Redis LPOP/RPUSH── matchmaking queue
                              ──Socket.IO──▶ browser (MATCH_FOUND)
Browser ──WS────▶ ws-server ──Redis──▶ Game state cache (TTL 1h)
                                     ──Redis pub "gameEnded"──▶ dbupdates
                                         └──▶ MongoDB (persist + Elo)
Browser ──WS────▶ stockfish-server ──Redis──▶ Game state
```

---

## AWS Target Architecture

### Service Mapping

| Current | AWS Replacement | Why |
|---|---|---|
| React/Vite SPA (nginx/node) | **S3 + CloudFront** | Static file hosting, global CDN, HTTPS by default |
| main-server (Express HTTP) | **ECS Fargate** (task) | Stateful Socket.IO for matchmaking needs persistent connections |
| ws-server (Socket.IO) | **ECS Fargate** (task) | Long-lived WebSocket connections — Lambda cannot hold them open |
| stockfish-server (Socket.IO + CPU) | **ECS Fargate** (task) | CPU-intensive Stockfish binary, long-lived WS connection |
| dbupdates microservice | **Lambda** (triggered by ElastiCache pub/sub via EventBridge or SQS) | Short-lived event handler — perfect Lambda use case |
| MongoDB | **DocumentDB** (MongoDB-compatible) | Fully managed, same Mongoose driver, automated backups |
| Redis (cache + pub/sub + queues) | **ElastiCache for Redis** (Cluster Mode) | Drop-in Redis replacement, managed failover |

---

## Detailed Component Design

### 1. Frontend — S3 + CloudFront

**What changes:**
- Run `npm run build` in the `client/` directory → produces a `dist/` folder.
- Upload `dist/` to an **S3 bucket** (static website enabled, public-read blocked — served only via CloudFront).
- Create a **CloudFront distribution** pointing at the S3 origin.
- Store the three `VITE_*` API URLs as CloudFront custom headers or bake them in at build time via a CI/CD step.

**Environment variables at build time:**
```
VITE_API_URL=https://api.chess64.com
VITE_GAME_SERVER_API_URL=https://ws.chess64.com
VITE_STOCKFISH_SERVER_API_URL=https://sf.chess64.com
```

**DNS:** Route53 A-record aliased to CloudFront distribution.

---

### 2. Main HTTP + Matchmaking Server — ECS Fargate

**Why ECS and not Lambda:**
The main server opens a persistent Socket.IO connection to each browser for the matchmaking lobby (`MATCH_FOUND` emit, heartbeat handling). Lambda functions time out after 15 minutes and cannot hold open sockets, so ECS Fargate is the right fit.

**Fargate task definition:**
- Image: push existing `server/` Dockerfile to **ECR** (Elastic Container Registry).
- Command: `npm run start:main`
- CPU: 512 / Memory: 1024 (scale up under load)
- Port mapping: 8080

**ECS Service:**
- Behind an **Application Load Balancer (ALB)** with WebSocket support enabled (sticky sessions on the ALB target group so Socket.IO connections pin to one task).
- Auto Scaling based on CPU / active connection count via CloudWatch.

**Environment variables (stored in AWS Secrets Manager / Parameter Store):**
```
PORT=8080
FRONTEND_URL=https://chess64.com
MONGODB_URL=mongodb://docdb-cluster.cluster-xxx.us-east-1.docdb.amazonaws.com:27017/64?tls=true&...
REDIS_URL=redis://chess64-redis.xxx.cache.amazonaws.com:6379
JWT_TOKEN_SECRET=<from Secrets Manager>
JWT_TOKEN_SIGNUP_MAIL_SECRET=<from Secrets Manager>
JWT_RESET_PASSWORD_SECRET=<from Secrets Manager>
NODEMAILER_MAIL=<from Secrets Manager>
NODEMAIL_APP_PASSWORD=<from Secrets Manager>
```

---

### 3. WebSocket Game Server — ECS Fargate

**Why ECS and not Lambda:**
Each active chess game holds an open Socket.IO room. A Bullet game (1 min) has a fixed end, but Rapid games can run 10+ minutes with continuous bidirectional events (every move). Lambda's cold start latency and 15-minute limit make it unsuitable.

**Fargate task definition:**
- Same ECR image, command: `npm run start:ws`
- CPU: 512 / Memory: 1024
- Port mapping: 9090

**ECS Service:**
- Behind its own ALB with **sticky sessions** (this is critical — a Socket.IO connection must hit the same task for the duration of a game).
- Because the `gameRegistry` is in-process memory (`Map`), scaling to multiple tasks requires that all tasks share the same Redis as the source of truth. The current code already handles this: `GameRegistry.getGame` falls back to `Game.loadGameFromRedis` if the game is not in local memory, so horizontal scaling works correctly.

**ALB listener rule:**
- Forward `wss://ws.chess64.com/*` to this target group.
- Enable WebSocket upgrade on the listener.

---

### 4. Stockfish AI Server — ECS Fargate

**Why ECS and not Lambda:**
- The Stockfish binary is a native executable (~5 MB). Lambda has a deployment package limit of 250 MB unzipped, and Stockfish needs CPU headroom for deep search (depth 15+ can take several seconds). ECS gives you full control over vCPU allocation.
- Socket.IO connection is long-lived for the duration of the AI game.

**Fargate task definition:**
- Same ECR image (Stockfish binary must be in the Docker image — the current `Dockerfile` should install `stockfish` via `apt-get`).
- Command: `npm run start:stockfish`
- CPU: 1024 (Stockfish is single-threaded but benefits from a full vCPU)
- Memory: 1024
- Port: 8081

**ECS Service:**
- Behind its own ALB (or a separate listener rule on the shared ALB).
- Sticky sessions required as above.
- Can scale independently of the game WS server.

---

### 5. DB-Update Microservice — Lambda

**Why Lambda fits here:**
The `databaseUpdation.js` microservice does one thing: listen on the Redis `gameEnded` pub/sub channel, write the game to DocumentDB, update two users' Elo ratings, then exit. There are no long-lived connections between events — it is a classic event-driven function.

**Approach — Redis pub/sub to Lambda via SQS:**
Redis pub/sub doesn't natively trigger Lambda. The recommended pattern is:

```
ws-server publishes "gameEnded" to Redis
        │
        ▼
Small ECS sidecar (or the ws-server itself) pushes the message to an SQS queue
        │
        ▼
Lambda (SQS trigger) — processes one "gameEnded" event per invocation
        │
        ▼
DocumentDB — save game + update Elo ratings
```

Alternatively, replace Redis pub/sub for the `gameEnded` event entirely with **Amazon SQS**:

```javascript
// In Game.js publishEndedGame() — replace RedisClient.publish:
const SQS = new AWS.SQS();
await SQS.sendMessage({
  QueueUrl: process.env.GAME_ENDED_QUEUE_URL,
  MessageBody: JSON.stringify(this.getGameState()),
}).promise();
```

Then Lambda is triggered directly by SQS — no sidecar needed.

**Lambda function:**
- Runtime: Node.js 22.x
- Trigger: SQS (`GameEndedQueue`)
- Memory: 256 MB / Timeout: 30 s
- Same business logic as `databaseUpdation.js` (connect to DocumentDB, upsert game, update Elo)
- VPC config required (DocumentDB is in a VPC)

> **Note:** Keep the `game:new` Redis pub/sub channel as-is since it is consumed by the ws-server ECS task (not Lambda). Only `gameEnded` needs the SQS migration.

---

### 6. Database — Amazon DocumentDB

DocumentDB is wire-compatible with MongoDB 5.x. The existing Mongoose models (`User.js`, `Game.model.js`) and all queries work without code changes.

**Cluster setup:**
- Instance class: `db.t3.medium` (start here, scale up)
- Multi-AZ: yes for production
- Enable TLS (required by DocumentDB) — add `?tls=true&tlsCAFile=...` to the connection string
- VPC: same VPC as ECS tasks and Lambda
- Security group: allow port 27017 from ECS task security group and Lambda security group only

**Connection string format:**
```
mongodb://username:password@chess64.cluster-xxx.us-east-1.docdb.amazonaws.com:27017/64?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

> `retryWrites=false` is required — DocumentDB does not support retryable writes.

**Migration:**
1. Export from local Mongo: `mongodump --uri mongodb://localhost:27017/64`
2. Import to DocumentDB: `mongorestore --uri "mongodb://user:pass@docdb-endpoint/64?tls=true&..."`

---

### 7. Cache, Queue, and Pub/Sub — ElastiCache for Redis

ElastiCache is a drop-in replacement. The `ioredis` client connects the same way.

**Cluster setup:**
- Engine: Redis 7.x
- Mode: Cluster mode disabled (single primary + 1 replica) — the current codebase uses `RedisClient.duplicate()` for pub/sub which requires multiple connections but not cluster-mode sharding.
- Node type: `cache.t3.medium`
- Multi-AZ with auto-failover: yes
- VPC: same VPC as ECS tasks, private subnet
- Security group: allow port 6379 from ECS task security group only

**What stays on Redis:**
- `game:<gameid>` — active game state (TTL 1h) ✅
- `socketMap` — userid → socket.id mapping ✅
- `queueMap:<mode>` + `queue:<mode>` — matchmaking queues (Lua scripts) ✅
- `requestIdMap` / `requestIdResolved` — matchmaking request tracking ✅
- `stockfishdepth` — AI game depth config ✅
- `gameInvite:<uuid>` — invite system (TTL 10 min) ✅
- `chess:quotes` — quotes cache (TTL 24h) ✅
- `game:new` pub/sub channel ✅

**What moves off Redis:**
- `gameEnded` pub/sub channel → replaced by SQS (as described in section 5)

---

## Network Architecture

```
Internet
   │
   ├── CloudFront ──▶ S3 (static SPA)
   │
   ├── ALB (main) ──▶ ECS: main-server (8080)  [matches HTTP + Socket.IO lobby]
   ├── ALB (ws)   ──▶ ECS: ws-server (9090)    [game WebSocket, sticky sessions]
   └── ALB (sf)   ──▶ ECS: stockfish-server (8081) [AI WebSocket]
   
VPC (private subnets)
   ├── ECS Tasks ──▶ ElastiCache Redis
   ├── ECS Tasks ──▶ DocumentDB
   ├── Lambda ────▶ DocumentDB (via VPC config)
   └── SQS (managed, outside VPC) ──▶ Lambda trigger
```

**ALB can be consolidated:** All three ECS services can sit behind a single ALB with path/host-based routing rules:
- `api.chess64.com` → main-server target group
- `ws.chess64.com` → ws-server target group  
- `sf.chess64.com` → stockfish target group

---

## IAM Roles

| Principal | Permissions needed |
|---|---|
| ECS task role (main + ws + stockfish) | `elasticache:Connect`, `sqs:SendMessage`, `secretsmanager:GetSecretValue` |
| ECS task role (main) | `ses:SendEmail` (if replacing Nodemailer with SES) |
| Lambda execution role | `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `ec2:CreateNetworkInterface` (VPC), `secretsmanager:GetSecretValue` |

---

## CI/CD (Recommended)

```
GitHub → GitHub Actions
    ├── client/: npm run build → aws s3 sync dist/ s3://chess64-frontend → CloudFront invalidation
    └── server/: docker build → ECR push → ECS service update (rolling deploy)
```

---

## Cost Estimate (rough, us-east-1, light traffic)

| Service | Config | Est. monthly |
|---|---|---|
| CloudFront + S3 | 10 GB transfer, 1M requests | ~$5 |
| ECS Fargate (3 tasks) | 0.5 vCPU + 1 GB each, ~720 hrs | ~$45 |
| ElastiCache | cache.t3.medium, single AZ | ~$50 |
| DocumentDB | db.t3.medium, single node | ~$60 |
| Lambda | 10K invocations × 256 MB × 2s | < $1 |
| SQS | 10K messages | < $1 |
| ALB | 1 ALB, 720 hrs | ~$18 |
| **Total** | | **~$180/month** |

Scale DocumentDB to Multi-AZ and ElastiCache to Multi-AZ and costs approximately double. Still far cheaper than a beefy self-managed EC2.

---

## Migration Checklist

- [ ] Create VPC with public subnets (ALB) and private subnets (ECS, DocumentDB, ElastiCache)
- [ ] Create ECR repositories and push server Docker image
- [ ] Create ElastiCache Redis cluster, capture endpoint
- [ ] Create DocumentDB cluster, run `mongorestore`
- [ ] Create Secrets Manager entries for all env vars
- [ ] Create ECS cluster, task definitions, and services for main / ws / stockfish
- [ ] Create ALBs and target groups with sticky sessions on ws and stockfish
- [ ] Build React app with production env vars, upload to S3, create CloudFront distribution
- [ ] Create SQS queue (`GameEndedQueue`) and update `Game.publishEndedGame()` to use SQS
- [ ] Deploy Lambda function (`gameEndedHandler`) with SQS trigger and VPC config
- [ ] Update CORS origins in all ECS task env vars to point to CloudFront domain
- [ ] Run smoke tests: login → matchmaking → game → resign → check Elo updated in DocumentDB
- [ ] Configure Route53 records
- [ ] Enable CloudFront HTTPS and ALB HTTPS (ACM certificate)

---

## Code Changes Required

The rearchitecture is nearly code-free. Only two targeted changes are needed:

### Change 1 — Replace `gameEnded` Redis pub/sub with SQS

In `server/classes/Game.js`, update `publishEndedGame()`:

```javascript
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

async publishEndedGame() {
    if (this.result.status !== constant.ONGOING) {
        // Keep Redis pub/sub for game:new consumers (ws-server)
        // but replace gameEnded with SQS
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.GAME_ENDED_QUEUE_URL,
            MessageBody: JSON.stringify(this.getGameState()),
        }));
        this.onEnd(this.gameid);
    }
}
```

Convert `databaseUpdation.js` into an AWS Lambda handler:

```javascript
// lambda/gameEndedHandler.js
const mongoose = require('mongoose');
const dbGame = require('./models/Game.model');
const User = require('./models/User');
const EloRank = require('elo-rank');
const constant = require('./constants');

let cachedDb = null;

async function connectDB() {
    if (cachedDb) return;
    cachedDb = await mongoose.connect(process.env.MONGODB_URL);
}

exports.handler = async (event) => {
    await connectDB();
    const elo = new EloRank(15);

    for (const record of event.Records) {
        const gameObj = JSON.parse(record.body);
        // ... same upsert + Elo logic as databaseUpdation.js ...
    }
};
```

### Change 2 — Add DocumentDB TLS CA bundle

DocumentDB requires TLS. Add the AWS CA bundle download to the Dockerfile or bundle it:

```dockerfile
# In server/Dockerfile
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /app/rds-ca.pem
```

Then in the connection string:
```
MONGODB_URL=mongodb://user:pass@cluster.docdb.amazonaws.com:27017/64?tls=true&tlsCAFile=/app/rds-ca.pem&retryWrites=false
```

---

## What Does NOT Need to Change

- All Mongoose schemas (`User.js`, `Game.model.js`) — DocumentDB is wire-compatible
- All `ioredis` usage — same API against ElastiCache
- All JWT auth middleware — stateless, no changes
- All Socket.IO game logic — runs inside ECS containers unchanged
- All Lua scripts for matchmaking queues — same Redis commands
- The Stockfish binary integration — runs in ECS with proper vCPU allocation
- The invite system — Redis TTL keys work identically on ElastiCache
- Nodemailer — can keep using Gmail SMTP or migrate to Amazon SES (optional)
