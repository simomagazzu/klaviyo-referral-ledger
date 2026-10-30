import { z } from "zod";

/**
 * Server-side environment variables.
 * Validated at startup — the app won't boot with invalid config.
 */
const serverEnvSchema = z.object({
  POSTGRES_URL: z.string().min(1, "POSTGRES_URL is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
}
