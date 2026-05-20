# TrueFeedback — Backend API

Native Express + TypeScript backend for TrueFeedback, using **Firebase Authentication** for identity and MongoDB for application data.

## Stack

| Layer | Tool |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| Language | TypeScript 5 |
| Database | MongoDB via Mongoose |
| Auth | Firebase Admin SDK (token verification) |
| Validation | Zod |
| Email | Resend (notification emails) |
| Dev runner | tsx + nodemon |

## Auth Architecture

Firebase handles **all** password management, email verification, and token lifecycle.
This backend only verifies Firebase ID tokens and stores application data (username, settings, messages) in MongoDB.

```
┌─────────────────────────────────────────────────────────────┐
│  REGISTRATION FLOW                                          │
│                                                             │
│  1. Frontend: createUserWithEmailAndPassword(email, pass)   │
│     └─ Firebase sends verification email automatically      │
│                                                             │
│  2. Frontend: getIdToken() → POST /api/auth/register        │
│     Body: { username }                                      │
│     └─ Backend verifies token, creates MongoDB user record  │
│                                                             │
│  EVERY SUBSEQUENT REQUEST                                   │
│                                                             │
│  3. Frontend: getIdToken() → any protected endpoint         │
│     Header: Authorization: Bearer <firebase-id-token>       │
│     └─ Backend verifies token via Firebase Admin SDK        │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── config/
│   ├── db.ts                      # MongoDB connection (singleton)
│   └── firebase.ts                # Firebase Admin SDK init (singleton)
├── controllers/
│   ├── auth.controller.ts         # register, getMe
│   ├── message.controller.ts      # send (public), get, delete
│   └── user.controller.ts         # accept-messages, username check
├── middlewares/
│   ├── auth.middleware.ts         # Firebase ID token verification
│   ├── validate.middleware.ts     # Zod request body validation
│   ├── rateLimiter.middleware.ts  # In-memory rate limiting
│   ├── error.middleware.ts        # Global error handler
│   └── notFound.middleware.ts     # 404 handler
├── models/
│   ├── User.model.ts              # firebaseUid, username, email, isAcceptingMessage
│   └── Message.model.ts           # userId ref, content, createdAt
├── routes/
│   ├── auth.routes.ts
│   ├── message.routes.ts
│   └── user.routes.ts
├── schemas/
│   └── index.ts                   # registerSchema, messageSchema, acceptMessageSchema
├── utils/
│   ├── apiResponse.ts             # sendSuccess / sendError helpers
│   └── email.ts                   # Resend notification email helper
├── app.ts                         # Express app setup
└── index.ts                       # Entry point
```

## API Reference

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | ✅ Firebase token | Create MongoDB profile after Firebase signup |
| `GET` | `/me` | ✅ Firebase token | Get current user's profile |

**POST /api/auth/register** — Body:
```json
{ "username": "johndoe" }
```

### Messages — `/api/messages`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/send/:username` | ❌ Public | Send anonymous message (rate limited: 5/10min) |
| `GET` | `/` | ✅ Firebase token | Get all my received messages |
| `DELETE` | `/:messageId` | ✅ Firebase token | Delete a message (owner only) |

### Users — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/check-username?username=` | ❌ Public | Check if username is available |
| `GET` | `/accept-messages` | ✅ Firebase token | Get current accept-messages setting |
| `PATCH` | `/accept-messages` | ✅ Firebase token | Toggle accept-messages |

**PATCH /api/users/accept-messages** — Body:
```json
{ "isAcceptingMessage": false }
```

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server liveness check |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Get Firebase credentials
#    Firebase Console → Project Settings → Service Accounts
#    → Generate new private key → copy values into .env

# 4. Start dev server
npm run dev

# 5. Build for production
npm run build && npm start
```

## Response Format

All endpoints return the same JSON shape:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { ... }
}
```

## Branch Strategy

```
main       — stable, production-ready
develop    — integration branch
feat/*     — new features  (e.g. feat/notifications)
fix/*      — bug fixes
chore/*    — maintenance   (e.g. chore/update-deps)
```
