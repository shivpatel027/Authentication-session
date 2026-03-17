import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Verifies the JWT and attaches user to req
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, role }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Checks the role on the verified token — always use after authenticate
// Usage: router.get("/admin", authenticate, authorize("admin"), handler)
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: insufficient permissions" });
  }

  next();
};