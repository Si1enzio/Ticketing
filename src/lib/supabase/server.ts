import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env, isSupabaseConfigured } from "@/lib/env";

let publicServerClient: ReturnType<typeof createClient> | null = null;

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
