import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(12),
  NEXTAUTH_URL: z.string().url(),
  APP_BASE_URL: z.string().url(),
  IOT_API_KEY: z.string().min(8).optional().default(""),
  DEFAULT_IOT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional().default(60_000),
  DEFAULT_IOT_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional().default(30),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().optional().default(587),
  SMTP_SECURE: z.string().optional().transform((v) => v === "true").default("false"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("IoT Attendance <no-reply@attendance.local>")
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
