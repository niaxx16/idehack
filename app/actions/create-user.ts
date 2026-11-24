'use server'

import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/require-admin'

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
    const denied = await requireAdmin()
    if (denied) return { success: false, error: denied }

    // If this email already belongs to a mentor/jury account (e.g. from a
    // previous event), move that account to this event instead of failing
    // with "already been registered". Past feedback/scores stay attached to
    // the same user id; the password is reset to the newly generated one so
    // the credentials shown to the admin are valid.
    const emailPattern = email.trim().replace(/[\\%_]/g, '\\$&')
    const { data: existingProfiles, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .ilike('email', emailPattern)
      .limit(1)

    if (lookupError) {
      console.error('Profile lookup error:', lookupError)
      return { success: false, error: lookupError.message }
    }

    const existing = existingProfiles?.[0]
    if (existing) {
      if (existing.role !== role) {
        return {
          success: false,
          error: `Bu e-posta zaten "${existing.role}" rolüyle kayıtlı; ${role} olarak tanımlanamaz.`
        }
      }

      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { full_name: fullName, role }
      })

      if (authUpdateError) {
        console.error('Auth update error:', authUpdateError)
        return { success: false, error: authUpdateError.message }
      }

      const { error: moveError } = await supabaseAdmin
        .from('profiles')
        .update({ event_id: eventId, full_name: fullName, display_name: fullName, display_password: password })
        .eq('id', existing.id)

      if (moveError) {
        console.error('Profile move error:', moveError)
        return { success: false, error: moveError.message }
      }

      return { success: true, email, password }
    }

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
        event_id: eventId,
        display_password: password
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
