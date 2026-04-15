### Setup and Installation 
#### Pre-Requisities     
- Node.js
- Redis
- MongoDB (local or cloud-based,like MongoDB Atlas)
- npm or yarn for package management

#### Installation
1. Clone the repository:   
```bash
git clone https://github.com/pushkar-iamops/chess-on-prem.git
```
2. Install dependencies for both the client and server:
```bash
# Navigate to server and install
cd server
npm install

# Navigate to client and install
cd ../client
npm install
```

3. Set up Environment Variables: See `env.example` for required variables and setup.    

4. Run The Application:   
```bash
# In the client folder
npm run dev

# In the server folder
npm run start:main
npm run start:ws
npm run start:stockfish
npm run start:microservice:dbupdates
```

---

## Docker (Mongo + Redis + All Services)

This repo includes a `docker-compose.yml` that starts:
- MongoDB (`27017`)
- Redis (`6379`)
- Main Server (`8080`)
- WS Server (`9090`)
- Stockfish Server (`8081`)
- DB Microservice (`9191`)
- Client (Vite) (`5173`)

### Start
```bash
docker compose up --build
```

Open: `http://localhost:5173`

### Notes
- `docker-compose.yml` overrides `MONGODB_URL` and `REDIS_URL` to use the Docker service names (`mongo`, `redis`), so your local `server/.env` can keep using `localhost` if you want.
- The Docker image installs Stockfish on Linux and the server uses it via `stockfish` in PATH. If you want to force a specific binary, set `STOCKFISH_PATH`.

### Environment Variables
The project relies on several environment variables. Create a .env file in both the server and client directories with the following variables:         
##### For Server: 
```bash
NODEMAIL_APP_PASSWORD=YOUR_NODEMAIL_APP_PASSWORD
NODEMAILER_MAIL=YOUR_NODEMAIL_EMAIL
MONGODB_URL="mongodb://localhost:27017"
JWT_TOKEN_SECRET=YOUR_JWT_SECRET_1
JWT_TOKEN_SIGNUP_MAIL_SECRET=YOUR_JWT_SECRET_2
JWT_RESET_PASSWORD_SECRET=YOUR_JWT_SECRET_3
FRONTEND_URL="http://localhost:5173"
REDIS_URL="redis://localhost:6379"
STOCKFISH_EMAIL=STOCKFISH_ACCOUNT_EMAIL_ID # stockfish is treated as a user 
STOCKFISH_PASSWORD=STOCKFISH_ACCOUNT_PASSWORD
```

##### For Client:
```bash
VITE_API_URL="http://localhost:8080"
VITE_GAME_SERVER_API_URL="http://localhost:9090"
VITE_STOCKFISH_SERVER_API_URL="http://localhost:8081"
```

### Tech Stack

#### Frontend
- **React**: For building a responsive and dynamic user interface.
- **React Router**: For handling routing in the single-page application.
- **Zustand**: Lightweight state management to handle user and session data.
- **Tailwind CSS**: For styling the application with a focus on customization and a responsive layout.
- **React Hot Toast**: For displaying user-friendly notifications.
- **React Chessboard**: For displaying chessboard.

#### Backend
- **Node.js**: JavaScript runtime used to build the server-side of the application.
- **Express.js**: Web framework for building RESTful APIs and handling middleware.
- **MongoDB**: NoSQL database for storing user and transaction data.
- **Mongoose**: ODM for MongoDB, providing schema and data validation.
- **JWT (JSON Web Tokens)**: For secure user authentication and session management.
- **Nodemailer**: For sending email notifications and handling email verification.
- **Redis** : For cache and storing game state temporarily.
- **Axios**: For handling HTTP requests in API calls.
- **chess.js** : For chess move validation
- **Stockfish** : To get best move in a chess position.

#### Security and Authorization
- **bcrypt**: For hashing user passwords to enhance security.
- **JWT Authentication**: For secure, token-based user authentication.
- **Environment Variables**: Sensitive information is stored in environment variables using .env files for security.

#### Authentication and Authorization
- **Signup & Login**: Users must sign up and log in to access most features.
- **JWT**: JSON Web Token (JWT) is used for user sessions.
- **Protected Routes**: API endpoints require a valid token in the Authorization header.
- **Email Verification**: After signup, users must verify their email before accessing their dashboard.

#### Backend Architecture
The backend is split into multiple servers, all communicating through **Redis** as a shared backbone.

| Server | Port | Responsibility |
|---|---|---|
| **Main Server** | 8080 | Auth, matchmaking, REST APIs, socket registry |
| **WS (Game) Server** | 9090 | Real-time gameplay via WebSocket |
| **Stockfish Server** | 8081 | gameplay with stockfish |
| **DB Microservice** | — | Batch-writes ended games to MongoDB |

---

#### Matchmaking & Game Flow

```
Phase 1 — Get a Request ID
──────────────────────────
Client  →  POST /api/game/get-requestid  { mode }
        ←  { requestId, redirect: "/find/blitz/<requestId>" }
Redis:     HSET requestIdMap   requestId → { userid, mode }

Phase 2 — Register Socket on Main Server
─────────────────────────────────────────
Client opens socket to Main Server (on the /find/<mode>/<requestId> page)
Redis:     HSET socketMap   userid → socket.id
           (used later to push MATCH_FOUND to the right client)

Phase 3 — Enter the Matchmaking Queue
──────────────────────────────────────
Client  →  POST /api/game/find-match  { mode, requestId }

Atomic Lua script runs in Redis:
  ┌──────────────────────────────────────────────────┐
  │  opponent = LPOP queue:<mode>                    │
  │  if opponent found:                              │
  │      HDEL queueMap:<mode>  opponent              │
  │      return { userid: opponent, requestId }      │
  │  else (no one waiting yet):                      │
  │      RPUSH queue:<mode>  myUserId                │
  │      HSET queueMap:<mode>  myUserId → requestId  │
  │      return nil                                  │
  └──────────────────────────────────────────────────┘

  → No opponent:   return { status: "WAITING" }
                   Client sits on /find/<mode>/<requestId> page and waits.

  → Opponent found (second player to hit find-match):
      gameid = new UUID
      PUBLISH "game:new" → { gameid, white_id, black_id, mode }
      Lookup socket IDs of both players from socketMap
      Emit MATCH_FOUND to both sockets:
          { gameid, white, black, websocket_url, redirect }
      HSET requestIdResolved  requestId → gameDetails (both players)
      return { status: "MATCH_FOUND", gameid }

  ⚡ Client does NOT poll — the server pushes MATCH_FOUND
     via socket the moment an opponent is found.

Phase 4 — WS Server Creates the Game (Redis Pub/Sub)
──────────────────────────────────────────────────────
WS Server is subscribed to "game:new" channel.
On message:
    gameRegistry.createGame(gameid, white_id, black_id, mode)
    → Game object created in WS server memory
    → Game state saved to Redis as  game:<gameid>  (TTL 1hr)

Phase 5 — Players Connect to WS Server & Play
───────────────────────────────────────────────
Both clients receive MATCH_FOUND and redirect to /game/blitz/<gameid>
They connect their socket to WS Server (port 9090):
    handshake: { token (JWT), gameid }

    → gameRegistry.getGame(gameid)  (memory → Redis fallback)
    → socket.join(gameid)           both players in same room

Events handled by WS Server:
    NEW_MOVE  →  game.makeMove()   →  broadcast to room
    RESIGN    →  game.resign()     →  publishEndedGame()
                                         → Redis publish "gameEnded"
                                         → game deleted from registry

Phase 6 — Game End
────────────────────
publishEndedGame():
    PUBLISH "gameEnded"  →  DB Microservice picks it up
                             and batch-writes final state to MongoDB
    onEnd(gameid)        →  Game object removed from WS server memory
```

---

#### Redis Keys Reference

| Key | Type | Purpose |
|---|---|---|
| `requestIdMap` | Hash | `requestId → { userid, mode }` — pending matchmaking requests |
| `requestIdResolved` | Hash | `requestId → gameDetails` — marks a request as matched/cancelled |
| `queue:<mode>` | List | FIFO queue of userids waiting for a match |
| `queueMap:<mode>` | Hash | `userid → requestId` — maps queued users to their request |
| `socketMap` | Hash | `userid → socketId` — used to emit events to specific clients |
| `game:<gameid>` | String | Full serialized game state (TTL: 1 hour) |
| `gameInvite:<uuid>` | Hash | `{ mode, player1, player2 }` — private invite state (TTL: 10 min) |
| `queueheartbeatmap` | Hash | `userid → timestamp` — heartbeat for detecting stale queue entries |

---

#### TL;DR — Matchmaking

1. **Client clicks "Start Game" (Rapid/Blitz/Bullet)**
   → hits `POST /api/game/get-requestid`
   → server generates a `requestId` (UUID), stores `requestId → { userid, mode }` in Redis (`requestIdMap`)
   → redirects client to `/find/<mode>/<requestId>`

2. **Client lands on `/find/<mode>/<requestId>`**
   → opens a socket connection to the **Main Server** (sends `userid` in handshake)
   → Main Server stores `userid → socketId` in Redis (`socketMap`) and fires back `socket:registered`

3. **On `socket:registered`, client hits `POST /api/game/find-match` once (not a poll)**
   → server first checks:
   - **Already in queue with same requestId?** → return `WAITING` (no-op)
   - **requestId already resolved?** → match already found, return `RESOLVED`
   → then runs an atomic Lua script in Redis:
   - **No one in queue?** → `RPUSH queue:<mode>`, stores `userid → requestId` in `queueMap:<mode>`, return `WAITING`
   - **Opponent found?** → `LPOP` opponent, create `gameid`, then:
     - mark both `requestId`s as resolved in `requestIdResolved` (so stale retries are handled)
     - publish `game:new` to Redis pub/sub → WS Server creates the Game object
     - look up both socket IDs from `socketMap`
     - **push `match_found` socket event to both clients**

4. **Client receives `match_found` → navigates to `/game/<gameid>`**
   → connects to **WS Server** with `{ token (JWT), gameid }` in handshake
   → WS Server decodes JWT to get `userid`, loads the game, joins the socket room
   → both players are now in the same room — moves, resign etc. flow in real-time


### Changelog
Refer to [CHANGELOG](CHANGELOG.md) for version history and updates.

### Version 2 Updates : 
Ref to [CHALLENGES](Challenges.md) to see what's coming up in V2.

### Contributing
We appreciate your interest in contributing to 64! Your contributions help us improve and grow. Please feel free to submit pull requests, report issues, or suggest new features. Your feedback and participation are highly valued as we continue to develop and enhance the platform.

### License
64 is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
