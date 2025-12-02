'use server'

import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface CreateUserParams {
  email: string
  password: string
  fullName: string
  role: 'mentor' | 'jury'
  eventId: string
}

interface CreateUserResult {
  success: boolean
  error?: string
  email?: string
  password?: string
}

export async function createUser(params: CreateUserParams): Promise<CreateUserResult> {
  const { email, password, fullName, role, eventId } = params

  try {
    // Create auth user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: role,
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'User creation failed' }
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        role: role,
        full_name: fullName,
        email: email,
        display_name: fullName,
        wallet_balance: 1000,
        event_id: eventId
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Try to clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: profileError.message }
    }

    return {
      success: true,
      email: email,
      password: password
    }
  } catch (error: any) {
    console.error('Failed to create user:', error)
    return { success: false, error: error.message || 'Unknown error occurred' }
  }
}
