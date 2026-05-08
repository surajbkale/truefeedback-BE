import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { authRouter } from "./routes/auth.routes.js";
import { messageRouter } from "./routes/message.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFound } from "./middlewares/notFound.middleware.js";

export const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  })
);

// ── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// ── Logging ──────────────────────────────────────────────────────────────────
if (process.env["NODE_ENV"] !== "production") {
  app.use(morgan("dev"));
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/messages", messageRouter);
app.use("/api/users", userRouter);

// ── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
