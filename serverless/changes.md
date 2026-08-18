Got it. So the `serverless/` folder is just a reference — when deploying you'll copy the contents of each file into the corresponding file in `server/`. The directory structure stays the same.

That means the `databaseUpdation.js` in `serverless/microservices/` will actually live at `server/microservices/databaseUpdation.js` when deployed, so the relative imports need to match that location — `../constants`, `../database/Models/...` — not `./`.

Let me fix that back:And the Dockerfile build context will be `server/` (the main directory), same as the existing one, so the COPYs need to reflect that too:So when you deploy, you:

1. Copy `serverless/microservices/databaseUpdation.js` → `server/microservices/databaseUpdation.js`
2. Copy `serverless/microservices/Dockerfile` → `server/microservices/Dockerfile`
3. Copy `serverless/classes/Game.js` → `server/classes/Game.js`
4. Copy `serverless/config/config.js` → `server/config/config.js`

Then from `server/`:
```bash
# Lambda image
docker build -t chess64-game-ended-handler -f microservices/Dockerfile .

# ECS backend image (existing Dockerfile at server/Dockerfile)
docker build -t chess64-backend .
```
