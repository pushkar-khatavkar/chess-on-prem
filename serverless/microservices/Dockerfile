# Lambda container image for the databaseUpdation handler.
# This Dockerfile lives at server/microservices/Dockerfile when deployed.
# Build context is server/ (the parent directory), same as the main Dockerfile.
#
# Build with:
#   docker build -t chess64-game-ended-handler -f microservices/Dockerfile .

FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY constants.js ./
COPY database/ ./database/
COPY microservices/databaseUpdation.js ./databaseUpdation.js

# Handler format: <file>.<exported function>
CMD ["databaseUpdation.handler"]