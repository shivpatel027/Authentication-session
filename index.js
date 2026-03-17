import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.route.js";
import viewRoutes from "./routes/views.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({ origin: "*" }));

// Body parser
app.use(express.json());

// Serve auth.js and any other assets in /public (CSS, images etc later)
app.use("/public", express.static(path.join(__dirname, "public")));

// API routes
app.use("/users", userRoutes);

// View routes — clean URLs like /login, /dashboard, /admin
app.use("/", viewRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open: http://localhost:${PORT}/login`);
});