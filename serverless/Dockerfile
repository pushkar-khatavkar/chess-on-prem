# CHANGED: added download of the AWS DocumentDB/RDS TLS CA bundle.
# DocumentDB requires TLS and rejects connections without a valid CA file.
# All other steps are unchanged from the original Dockerfile.

FROM node:20-bullseye-slim

WORKDIR /app

# Stockfish binary for Linux + build tools (bcrypt native build fallback if needed)
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/*

# CHANGED: download the global AWS RDS/DocumentDB CA bundle
RUN curl -sSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    -o /app/rds-ca.pem

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8080 8081 9090 9191

CMD ["npm", "run", "start:main"]
