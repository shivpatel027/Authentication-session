import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const views = path.join(__dirname, "../public");

// Public routes — no auth needed
router.get("/login",   (req, res) => res.sendFile(path.join(views, "login.html")));
router.get("/signup",  (req, res) => res.sendFile(path.join(views, "signup.html")));

// Protected routes — auth is enforced on the frontend (redirects to /login if no token)
router.get("/dashboard", (req, res) => res.sendFile(path.join(views, "dashboard.html")));
router.get("/profile",   (req, res) => res.sendFile(path.join(views, "profile.html")));
router.get("/admin",     (req, res) => res.sendFile(path.join(views, "admin.html")));

// Root → redirect to login
router.get("/", (req, res) => res.redirect("/login"));

export default router;