import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set — db calls will fail at runtime.");
}

const client = postgres(connectionString ?? "postgres://invalid", {
  max: 10,
  idle_timeout: 600,
  prepare: false,
});

export const db = drizzle(client, { schema });
export { schema };
