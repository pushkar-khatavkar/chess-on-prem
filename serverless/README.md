# Serverless Deployment Guide

This folder contains the modified files for AWS deployment.  
Before running any commands, copy each file into the corresponding location in `server/`:

| Copy from `serverless/` | To `server/` |
|---|---|
| `classes/Game.js` | `classes/Game.js` |
| `microservices/databaseUpdation.js` | `microservices/databaseUpdation.js` |
| `microservices/Dockerfile` | `microservices/Dockerfile` |
| `config/config.js` | `config/config.js` |
| `Dockerfile` | `Dockerfile` |

All commands below are run from the `server/` directory unless stated otherwise.

---

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- Docker installed and running
- An AWS account with permissions for ECR, ECS, Lambda, SQS, ElastiCache, DocumentDB, S3, CloudFront, ALB, and IAM

---

## Step 1 — Create ECR Repositories

```bash
aws ecr create-repository --repository-name chess64-backend --region <your-region>
```

```bash
aws ecr create-repository --repository-name chess64-game-ended-handler --region <your-region>
```

---

## Step 2 — Authenticate Docker with ECR

```bash
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<your-region>.amazonaws.com
```

---

## Step 3 — Build the ECS Backend Image

Run from `server/`:

```bash
docker build -t chess64-backend .
```

---

## Step 4 — Build the Lambda Container Image

Run from `server/` using the Dockerfile inside `microservices/`:

```bash
docker build -t chess64-game-ended-handler -f microservices/Dockerfile .
```

---

## Step 5 — Tag and Push ECS Backend Image to ECR

```bash
docker tag chess64-backend:latest <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-backend:latest
```

```bash
docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-backend:latest
```

---

## Step 6 — Tag and Push Lambda Image to ECR

```bash
docker tag chess64-game-ended-handler:latest <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-game-ended-handler:latest
```

```bash
docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-game-ended-handler:latest
```

---

## Step 7 — Create the SQS Queue

```bash
aws sqs create-queue --queue-name GameEndedQueue --region <your-region>
```

Note the `QueueUrl` from the output — you will need it in Step 9 and Step 11.

---

## Step 8 — Store Secrets in AWS Secrets Manager

Do this once for each secret. Replace the values with your real ones.

```bash
aws secretsmanager create-secret --name chess64/JWT_TOKEN_SECRET --secret-string "<your-jwt-secret>"
```

```bash
aws secretsmanager create-secret --name chess64/JWT_TOKEN_SIGNUP_MAIL_SECRET --secret-string "<your-jwt-signup-secret>"
```

```bash
aws secretsmanager create-secret --name chess64/JWT_RESET_PASSWORD_SECRET --secret-string "<your-jwt-reset-secret>"
```

```bash
aws secretsmanager create-secret --name chess64/NODEMAIL_APP_PASSWORD --secret-string "<your-nodemailer-password>"
```

```bash
aws secretsmanager create-secret --name chess64/STOCKFISH_PASSWORD --secret-string "<your-stockfish-password>"
```

---

## Step 9 — Create ECS Task Definitions

Create a task definition JSON file for each service (main, ws, stockfish) with the following environment variables:

```
PORT=8080
FRONTEND_URL=https://<your-cloudfront-domain>
MONGODB_URL=mongodb://<user>:<pass>@<docdb-endpoint>:27017/64?tls=true&tlsCAFile=/app/rds-ca.pem&retryWrites=false
REDIS_URL=redis://<elasticache-endpoint>:6379
JWT_TOKEN_SECRET=<from Secrets Manager>
JWT_TOKEN_SIGNUP_MAIL_SECRET=<from Secrets Manager>
JWT_RESET_PASSWORD_SECRET=<from Secrets Manager>
NODEMAILER_MAIL=<your-email>
NODEMAIL_APP_PASSWORD=<from Secrets Manager>
STOCKFISH_EMAIL=<stockfish-account-email>
STOCKFISH_PASSWORD=<from Secrets Manager>
AWS_REGION=<your-region>
GAME_ENDED_QUEUE_URL=<SQS QueueUrl from Step 7>
```

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-def-main.json
```

```bash
aws ecs register-task-definition --cli-input-json file://task-def-ws.json
```

```bash
aws ecs register-task-definition --cli-input-json file://task-def-stockfish.json
```

---

## Step 10 — Create ECS Cluster and Services

```bash
aws ecs create-cluster --cluster-name chess64
```

```bash
aws ecs create-service --cluster chess64 --service-name main-server --task-definition chess64-main --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}"
```

```bash
aws ecs create-service --cluster chess64 --service-name ws-server --task-definition chess64-ws --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}"
```

```bash
aws ecs create-service --cluster chess64 --service-name stockfish-server --task-definition chess64-stockfish --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}"
```

> Enable sticky sessions on the ALB target groups for `ws-server` and `stockfish-server` — required for Socket.IO.

---

## Step 11 — Create the Lambda Function

```bash
aws lambda create-function \
  --function-name gameEndedHandler \
  --package-type Image \
  --code ImageUri=<account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-game-ended-handler:latest \
  --role arn:aws:iam::<account-id>:role/<lambda-execution-role> \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={MONGODB_URL=<docdb-connection-string>,AWS_REGION=<your-region>}"
```

---

## Step 12 — Add SQS Trigger to Lambda

```bash
aws lambda create-event-source-mapping \
  --function-name gameEndedHandler \
  --event-source-arn arn:aws:sqs:<your-region>:<account-id>:GameEndedQueue \
  --batch-size 1
```

---

## Step 13 — Deploy the Frontend to S3 + CloudFront

Run from `client/`:

```bash
VITE_API_URL=https://api.<your-domain>.com \
VITE_GAME_SERVER_API_URL=https://ws.<your-domain>.com \
VITE_STOCKFISH_SERVER_API_URL=https://sf.<your-domain>.com \
npm run build
```

```bash
aws s3 sync dist/ s3://<your-s3-bucket-name> --delete
```

Invalidate the CloudFront cache after every frontend deploy:

```bash
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

---

## Step 14 — Verify Everything is Running

Check ECS services are stable:

```bash
aws ecs describe-services --cluster chess64 --services main-server ws-server stockfish-server
```

Check Lambda is receiving SQS events:

```bash
aws lambda get-event-source-mapping --uuid <mapping-uuid-from-step-12>
```

Tail Lambda logs:

```bash
aws logs tail /aws/lambda/gameEndedHandler --follow
```

---

## Updating After Code Changes

**Backend (ECS):**

```bash
docker build -t chess64-backend .
docker tag chess64-backend:latest <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-backend:latest
docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-backend:latest
aws ecs update-service --cluster chess64 --service main-server --force-new-deployment
aws ecs update-service --cluster chess64 --service ws-server --force-new-deployment
aws ecs update-service --cluster chess64 --service stockfish-server --force-new-deployment
```

**Lambda:**

```bash
docker build -t chess64-game-ended-handler -f microservices/Dockerfile .
docker tag chess64-game-ended-handler:latest <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-game-ended-handler:latest
docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-game-ended-handler:latest
aws lambda update-function-code --function-name gameEndedHandler --image-uri <account-id>.dkr.ecr.<your-region>.amazonaws.com/chess64-game-ended-handler:latest
```

**Frontend:**

```bash
npm run build
aws s3 sync dist/ s3://<your-s3-bucket-name> --delete
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```
