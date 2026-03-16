import "dotenv/config";
import express from "express";
import userRoutes from "./routes/user.route.js";

const app = express();
const PORT = process.env.PORT || 3000; // Make port configurable via env

// Body parser
app.use(express.json());

// Routes
app.use("/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});