import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: ".local/stylecraft-dev.sqlite",
  },
  strict: true,
  verbose: true,
});
