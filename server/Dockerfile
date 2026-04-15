FROM node:20-bullseye-slim

WORKDIR /app

# Stockfish binary for Linux + build tools (bcrypt native build fallback if needed)
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8080 8081 9090 9191

CMD ["npm", "run", "start:main"]
