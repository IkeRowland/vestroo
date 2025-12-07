/**
 * @deprecated Use '@/lib/supabase/client' for client components or '@/lib/supabase/server' for server components
 * This file is kept for backward compatibility but will be removed in a future version.
 */

// Re-export from client for backward compatibility
export { createClientClient } from './supabase/client';

// Note: Server functions are not re-exported here to prevent client components from importing them
// Use '@/lib/supabase/server' directly in server components

