'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Inactivity timeout in milliseconds (2 hours = 7200000ms)
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000

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

  // Pages that don't require inactivity check
  const publicPaths = ['/', '/login', '/student']
  const isPublicPath = publicPaths.some(path => pathname === path || pathname?.startsWith('/student'))

  const handleSignOut = useCallback(async () => {
    try {
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

  useEffect(() => {
    // Check if user was inactive when page loads (e.g., returning to tab)
    const checkStoredActivity = async () => {
      const storedLastActivity = localStorage.getItem('lastActivity')
      if (storedLastActivity) {
        const lastActivity = parseInt(storedLastActivity, 10)
        const now = Date.now()

        if (now - lastActivity > INACTIVITY_TIMEOUT) {
          // User was inactive for too long
          const { data: { user } } = await supabase.auth.getUser()
          if (user && !isPublicPath) {
            handleSignOut()
            return
          }
        }
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
      localStorage.setItem('lastActivity', Date.now().toString())
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if timeout expired while tab was hidden
        const storedLastActivity = localStorage.getItem('lastActivity')
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
  }, [isPublicPath, resetTimer, handleSignOut])

  return <>{children}</>
}
