# TrueFeedback — Backend API

Native Express + TypeScript backend for TrueFeedback, extracted from the Next.js monolith.

## Stack

| Layer | Tool |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| Language | TypeScript 5 |
| Database | MongoDB via Mongoose |
| Auth | JWT (httpOnly cookies) |
| Validation | Zod |
| Email | Resend |
| Dev runner | tsx + nodemon |

## Project Structure

```
src/
├── config/
│   └── db.ts                  # MongoDB connection
├── controllers/
│   ├── auth.controller.ts     # sign-up, verify, sign-in, sign-out, me
│   ├── message.controller.ts  # send, get, delete
│   └── user.controller.ts     # accept-messages toggle, username check
├── middlewares/
│   ├── auth.middleware.ts     # JWT authentication
│   ├── validate.middleware.ts # Zod request body validation
│   ├── rateLimiter.middleware.ts  # In-memory rate limiting
│   ├── error.middleware.ts    # Global error handler
│   └── notFound.middleware.ts # 404 handler
├── models/
│   ├── User.model.ts
│   └── Message.model.ts
├── routes/
│   ├── auth.routes.ts
│   ├── message.routes.ts
│   └── user.routes.ts
├── schemas/
│   └── index.ts               # All Zod schemas
├── utils/
│   ├── apiResponse.ts         # Consistent JSON response helpers
│   ├── jwt.ts                 # Sign / verify token
│   └── email.ts               # Resend email helper
├── app.ts                     # Express app setup
└── index.ts                   # Entry point
```

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sign-up` | ❌ | Register with email OTP |
| POST | `/verify/:username` | ❌ | Verify email OTP |
| POST | `/sign-in` | ❌ | Login, returns JWT |
| POST | `/sign-out` | ✅ | Clear auth cookie |
| GET | `/me` | ✅ | Get current user |

### Messages — `/api/messages`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/send/:username` | ❌ | Send anonymous message |
| GET | `/` | ✅ | Get all received messages |
| DELETE | `/:messageId` | ✅ | Delete a message |

### Users — `/api/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/check-username?username=` | ❌ | Check username availability |
| GET | `/accept-messages` | ✅ | Get current accept setting |
| PATCH | `/accept-messages` | ✅ | Toggle accept setting |

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Server health check |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, RESEND_API_KEY, etc.

# 3. Start development server
npm run dev

# 4. Build for production
npm run build
npm start
```

## Branch Strategy

```
main          — stable, production-ready code
develop       — integration branch
feat/*        — feature branches (e.g. feat/oauth, feat/rate-limiting)
fix/*         — bug fix branches
chore/*       — maintenance (deps, config, etc.)
```
