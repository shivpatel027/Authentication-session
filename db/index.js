import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString);

const db = drizzle(client);

export default db;