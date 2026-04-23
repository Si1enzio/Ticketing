import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env, isSupabaseConfigured } from "@/lib/env";
import { isSupabaseAdminConfigured, serverEnv } from "@/lib/env.server";

let publicServerClient: ReturnType<typeof createClient> | null = null;

type SupabaseAdminTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type SupabaseAdminDatabase = {
  public: {
    Tables: {
      profiles: SupabaseAdminTable;
      user_roles: SupabaseAdminTable;
      audit_logs: SupabaseAdminTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};

let adminServerClient: SupabaseClient<SupabaseAdminDatabase> | null = null;

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // În unele contexte de render cookie-urile nu pot fi rescrise.
        }
      },
    },
  });
}

export function createSupabasePublicServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!publicServerClient) {
    publicServerClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return publicServerClient;
}

export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return null;
  }

  if (!adminServerClient) {
    adminServerClient = createClient<SupabaseAdminDatabase>(
      env.supabaseUrl,
      serverEnv.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminServerClient;
}
