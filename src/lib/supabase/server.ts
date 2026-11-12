import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicKey, isSupabaseConfigured } from "./client";

export async function getSupabaseServerClient() {
  const key = getSupabasePublicKey();
  if (!isSupabaseConfigured() || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Safe to ignore in Server Components when proxy refreshes sessions
        }
      },
    },
  });
}
