import dotenv from "dotenv";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";

dotenv.config();

const port = Number(process.env.PORT || 4000);

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required. Copy apps/server/.env.example to apps/server/.env.");
  process.exit(1);
}

const app = createApp();

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB.", error.message);
    process.exit(1);
  });
