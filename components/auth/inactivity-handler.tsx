'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Inactivity timeout in milliseconds (2 hours = 7200000ms)
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000

// localStorage keys
const LAST_ACTIVITY_KEY = 'lastActivity'
const SESSION_ID_KEY = 'sessionId'

// Events that reset the inactivity timer
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
]

export function InactivityHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const initializedRef = useRef(false)

  // Pages that don't require inactivity check
  const publicPaths = ['/', '/login', '/join', '/rejoin']
  const isPublicPath = publicPaths.some(path => pathname === path || pathname?.startsWith('/join'))

  const handleSignOut = useCallback(async () => {
    try {
      // Clear activity tracking on sign out
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      localStorage.removeItem(SESSION_ID_KEY)
      await supabase.auth.signOut()
      router.push('/login?reason=inactivity')
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/login')
    }
  }, [supabase, router])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only set timeout for protected routes
    if (!isPublicPath) {
      timeoutRef.current = setTimeout(() => {
        handleSignOut()
      }, INACTIVITY_TIMEOUT)
    }
  }, [isPublicPath, handleSignOut])

  // Initialize session tracking when user logs in
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const initializeSessionTracking = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const currentSessionId = session.access_token.substring(0, 20) // Use part of token as session identifier
        const storedSessionId = localStorage.getItem(SESSION_ID_KEY)

        // If this is a new session (different from stored), reset the activity timer
        if (storedSessionId !== currentSessionId) {
          localStorage.setItem(SESSION_ID_KEY, currentSessionId)
          localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
        }
      } else {
        // No session - clear any stale activity data
        localStorage.removeItem(LAST_ACTIVITY_KEY)
        localStorage.removeItem(SESSION_ID_KEY)
      }
    }

    initializeSessionTracking()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // New login - reset activity tracking
        const newSessionId = session.access_token.substring(0, 20)
        localStorage.setItem(SESSION_ID_KEY, newSessionId)
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
      } else if (event === 'SIGNED_OUT') {
        // Clear on sign out
        localStorage.removeItem(LAST_ACTIVITY_KEY)
        localStorage.removeItem(SESSION_ID_KEY)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    // Check if user was inactive when page loads (e.g., returning to tab)
    const checkStoredActivity = async () => {
      // Skip check on public paths
      if (isPublicPath) return

      const { data: { session } } = await supabase.auth.getSession()

      // No session means no need to check inactivity
      if (!session) return

      const storedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
      const storedSessionId = localStorage.getItem(SESSION_ID_KEY)
      const currentSessionId = session.access_token.substring(0, 20)

      // If session IDs don't match, this is a new session - don't sign out
      if (storedSessionId !== currentSessionId) {
        localStorage.setItem(SESSION_ID_KEY, currentSessionId)
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
        return
      }

      if (storedLastActivity) {
        const lastActivity = parseInt(storedLastActivity, 10)
        const now = Date.now()

        if (now - lastActivity > INACTIVITY_TIMEOUT) {
          // User was inactive for too long
          handleSignOut()
          return
        }
      } else {
        // No stored activity but has session - initialize it
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
      }
    }

    checkStoredActivity()
  }, [supabase, isPublicPath, handleSignOut])

  useEffect(() => {
    if (isPublicPath) return

    // Initial timer setup
    resetTimer()

    // Update localStorage periodically
    const updateStoredActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
    }

    // Activity event handlers
    const handleActivity = () => {
      resetTimer()
      updateStoredActivity()
    }

    // Add event listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Handle visibility change (user switches tabs)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // First check if we still have a valid session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Check if timeout expired while tab was hidden
        const storedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
        if (storedLastActivity) {
          const lastActivity = parseInt(storedLastActivity, 10)
          const now = Date.now()

          if (now - lastActivity > INACTIVITY_TIMEOUT) {
            handleSignOut()
            return
          }
        }
        resetTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isPublicPath, resetTimer, handleSignOut, supabase])

  return <>{children}</>
}
