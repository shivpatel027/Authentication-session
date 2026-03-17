# AuthKit — Production Auth System

A full-stack authentication system built with **Node.js**, **Express**, **PostgreSQL**, and **Drizzle ORM**. Features JWT access tokens, refresh token sessions stored in the database, and role-based access control with a clean HTML/CSS/JS frontend.

---

## Features

- **Signup & Login** with bcrypt password hashing
- **JWT Access Tokens** (15 min expiry) — stateless, no DB hit on every request
- **Refresh Token Sessions** stored in PostgreSQL — supports true logout and session invalidation
- **Role-Based Access Control** — `admin` and `user` roles enforced at both API and frontend level
- **Auto Token Refresh** — frontend silently refreshes expired tokens without logging the user out
- **Protected Routes** — middleware guards API endpoints and frontend pages
- **Admin Panel** — view all users, promote/demote roles
- **Clean URL Frontend** — served directly from Express (`/login`, `/dashboard`, `/admin`)

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Runtime    | Node.js v24+                      |
| Framework  | Express.js                        |
| Database   | PostgreSQL (via Docker)           |
| ORM        | Drizzle ORM                       |
| Auth       | JWT (jsonwebtoken) + bcrypt       |
| Frontend   | Plain HTML / CSS / JS             |

---

## Project Structure

```
Authentication-session/
├── public/                  # Frontend pages (served by Express)
│   ├── auth.js              # Shared auth utilities (token storage, authFetch, logout)
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── profile.html
│   └── admin.html
├── routes/
│   ├── user.route.js        # All auth + user API routes
│   └── views.js             # Serves HTML pages at clean URLs
├── middleware/
│   └── auth.middleware.js   # authenticate + authorize middleware
├── db/
│   ├── index.js             # Drizzle client
│   └── schema.js            # usersTable + sessionsTable
├── index.js                 # Express app entry point
├── drizzle.config.js
├── docker-compose.yml
├── .env
└── package.json
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourname/Authentication-session.git
cd Authentication-session
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start PostgreSQL via Docker

```bash
docker-compose up -d
```

### 4. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/authkit
JWT_SECRET=your-long-random-secret-here
JWT_REFRESH_SECRET=another-long-random-secret-here
PORT=3000
```

Generate secure secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Push the schema to the database

```bash
npx drizzle-kit push
```

### 6. Start the server

```bash
node index.js
```

### 7. Open in browser

```
http://localhost:3000/login
```

---

## API Reference

### Auth Routes

| Method | Endpoint           | Auth     | Description                          |
|--------|--------------------|----------|--------------------------------------|
| POST   | `/users/signup`    | Public   | Create a new user account            |
| POST   | `/users/login`     | Public   | Login and receive tokens             |
| POST   | `/users/refresh`   | Public   | Get a new access token               |
| POST   | `/users/logout`    | Required | Invalidate refresh token session     |

### User Routes

| Method | Endpoint              | Auth        | Description                     |
|--------|-----------------------|-------------|---------------------------------|
| GET    | `/users/me`           | Any user    | Get current user profile        |
| GET    | `/users/`             | Admin only  | Get all users                   |
| PATCH  | `/users/:id/role`     | Admin only  | Update a user's role            |

### Request / Response Examples

**POST /users/signup**
```json
// Request
{ "username": "johndoe", "email": "john@example.com", "password": "password123" }

// Response 201
{ "message": "User created successfully", "userId": "uuid-here" }
```

**POST /users/login**
```json
// Request
{ "email": "john@example.com", "password": "password123" }

// Response 200
{
  "message": "Login successful",
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3d4...",
  "user": { "id": "uuid", "username": "johndoe", "email": "john@example.com", "role": "user" }
}
```

**POST /users/refresh**
```json
// Request
{ "refreshToken": "a1b2c3d4..." }

// Response 200
{ "accessToken": "eyJhbGci..." }
```

**PATCH /users/:id/role** *(Admin only)*
```json
// Request
{ "role": "admin" }

// Response 200
{ "message": "Role updated", "user": { "id": "uuid", "role": "admin" } }
```

---

## Database Schema

### users
| Column      | Type        | Notes                        |
|-------------|-------------|------------------------------|
| id          | uuid        | Primary key, auto-generated  |
| username    | varchar(255)| Required                     |
| email       | varchar(255)| Unique, required             |
| password    | text        | bcrypt hash                  |
| role        | enum        | `admin` or `user` (default)  |
| created_at  | timestamp   | Auto-set on insert           |
| updated_at  | timestamp   | Auto-updated on every write  |

### sessions
| Column        | Type      | Notes                           |
|---------------|-----------|---------------------------------|
| id            | uuid      | Primary key, auto-generated     |
| user_id       | uuid      | Foreign key → users.id (cascade)|
| refresh_token | text      | Unique hex string               |
| expires_at    | timestamp | 30 days from login              |
| created_at    | timestamp | Auto-set on insert              |

---

## How Auth Works

```
1. Signup  →  password hashed with bcrypt (10 rounds)
2. Login   →  issues access token (15min JWT) + refresh token (30d, stored in DB)
3. Request →  client sends Authorization: Bearer <accessToken>
4. Expired →  client auto-calls /users/refresh → gets new access token silently
5. Logout  →  refresh token deleted from DB → session permanently invalidated
```

### Role-Based Access Control

```
Public         →  /login, /signup
Any user       →  /dashboard, /profile, GET /users/me
Admin only     →  /admin, GET /users/, PATCH /users/:id/role
```

Roles are embedded in the JWT so no database hit is needed on every request. When a user's role is changed by an admin, it takes effect on their next login (when a new token is issued).

---

## Frontend Pages

| URL           | Description                              | Access      |
|---------------|------------------------------------------|-------------|
| `/login`      | Email + password login                   | Public      |
| `/signup`     | Register new account + password strength | Public      |
| `/dashboard`  | Account overview + stats                 | Any user    |
| `/profile`    | View account info + session management   | Any user    |
| `/admin`      | User management table + role controls    | Admin only  |

---

## Promoting a User to Admin

New signups always default to the `user` role. To create your first admin, either:

**Via Drizzle Studio:**
```bash
npx drizzle-kit studio
```
Find the user in the `users` table and set `role` to `admin`.

**Via SQL:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

**Via API** *(once you have an admin account)*:
```bash
PATCH /users/:id/role
Authorization: Bearer <adminAccessToken>
Body: { "role": "admin" }
```

---

## Security Notes

- Passwords are hashed with **bcrypt** (10 salt rounds) — the salt is embedded in the hash
- Refresh tokens are **cryptographically random** 64-byte hex strings — not JWTs
- Access tokens expire in **15 minutes** — short window limits damage if stolen
- Refresh tokens are stored **hashed** in the DB and deleted on logout
- Role is embedded in the JWT — no DB hit needed for authorization on every request
- Error messages use **consistent wording** on login to prevent email enumeration

---

## License

MIT
