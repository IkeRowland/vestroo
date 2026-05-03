import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

/**
 * Server-side Supabase client
 * Uses service role key for admin operations (webhooks, server actions)
 * For use in Server Components, Server Actions, and API routes
 */
export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // For server-side operations that need admin access, use service role key
  // This should only be used in server actions, API routes, and webhooks
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Alias for {@link createServerClient} — Epic 15 / **15C.2** comms matrix reads (`comms_*` RLS). */
export async function createServiceRoleClient() {
  return createServerClient();
}

/**
 * Server-side Supabase client for user operations
 * Uses SSR cookie-based authentication
 * For use in Server Components
 *
 * Wrapped in React `cache()` so the same request shares one client instance
 * (layout `requireOpsStaffPage` + page loaders avoid duplicate auth churn).
 */
export const createUserServerClient = cache(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = await cookies();

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
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
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
});

