import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function useAuth() {
  const { user, profile, isLoading, setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        // Fetch profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(data)
      }
      setLoading(false)
    }

    initSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user && event !== 'INITIAL_SESSION') {
        // Fetch profile when user signs in (but not on initial session)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(data)
      } else if (!session?.user) {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signInAnonymously = async (displayName?: string) => {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          display_name: displayName || 'Anonymous User',
        },
      },
    })

    if (error) throw error
    return data
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Update user in store
      setUser(data.user)

      // Fetch and set profile
      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        setProfile(profileData)
        setLoading(false)
      }

      return data
    } catch (err) {
      console.error('Sign in error:', err)
      throw err
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const joinTeam = async (accessToken: string) => {
    const { data, error } = await supabase.rpc('join_team_by_token', {
      access_token_input: accessToken,
    })

    if (error) throw error

    // Refresh profile to get updated team_id
    if (user) {
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (updatedProfile) {
        setProfile(updatedProfile)
      }
    }

    return data
  }

  return {
    user,
    profile,
    isLoading,
    signInAnonymously,
    signInWithEmail,
    signOut,
    joinTeam,
  }
}
