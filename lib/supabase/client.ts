import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Custom storage that uses sessionStorage instead of localStorage
// This ensures sessions are cleared when the browser is closed
const sessionStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return window.sessionStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(key)
  },
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: sessionStorageAdapter,
        storageKey: 'inovasprint-auth',
        flowType: 'pkce',
      },
    }
  )
}
