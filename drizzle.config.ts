import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql", // 👈 aqui estava faltando
  dbCredentials: {
    url: process.env.DATABASE_URL!, // 👈 use "url" e não "connectionString"
  },
} satisfies Config;

