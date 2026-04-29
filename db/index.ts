import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Don't throw at import time during build/lint where DATABASE_URL may be absent;
  // throw lazily on first use instead.
  console.warn("DATABASE_URL is not set — db calls will fail at runtime.");
}

const sql = neon(connectionString ?? "postgres://invalid");
export const db = drizzle(sql, { schema });
export { schema };
