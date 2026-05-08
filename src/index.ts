import "dotenv/config";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env["PORT"] ?? 8000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   ENV: ${process.env["NODE_ENV"] ?? "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
