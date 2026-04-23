import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const parsedServerEnv = serverEnvSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export const serverEnv = {
  supabaseServiceRoleKey: parsedServerEnv.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export function isSupabaseAdminConfigured() {
  return Boolean(serverEnv.supabaseServiceRoleKey);
}
