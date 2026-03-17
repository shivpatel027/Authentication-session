import express from "express";
import db from "../db/index.js";
import { usersTable, sessionsTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
// const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");
// if (!JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET environment variable is not set");

// Helper: generate tokens
const generateAccessToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "15m" });

const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

// GET current user (protected)
router.get("/me", authenticate, async (req, res) => {
  try {
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.userId));

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(usersTable)
      .values({ username, email, password: hashedPassword })
      .returning({ id: usersTable.id });

    res.status(201).json({ message: "User created successfully", userId: newUser.id });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// LOGIN — issues access token + refresh token, stores session in DB
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Generate both tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store refresh token in DB
    await db.insert(sessionsTable).values({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });

    res.json({
      message: "Login successful",
      accessToken,           // short-lived (15min), use for API requests
      refreshToken,          // long-lived (30d), use only to get new access tokens
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// REFRESH — exchange a valid refresh token for a new access token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    // Look up session in DB
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.refresh_token, refreshToken));

    if (!session) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Check expiry
    if (new Date() > session.expires_at) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
      return res.status(401).json({ error: "Refresh token expired, please log in again" });
    }

    // Fetch user and issue new access token
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.user_id));

    if (!user) return res.status(401).json({ error: "User not found" });

    const accessToken = generateAccessToken(user);

    res.json({ accessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// LOGOUT — deletes the session from DB, invalidating the refresh token
router.post("/logout", authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.refresh_token, refreshToken));

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;