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

interface DeleteUserParams {
  userId: string
  role: 'mentor' | 'jury'
}

interface DeleteUserResult {
  success: boolean
  error?: string
}

export async function deleteUser(params: DeleteUserParams): Promise<DeleteUserResult> {
  const { userId, role } = params

  try {
    // If mentor, delete their assignments first
    if (role === 'mentor') {
      const { error: assignmentError } = await supabaseAdmin
        .from('mentor_assignments')
        .delete()
        .eq('mentor_id', userId)

      if (assignmentError) {
        console.error('Failed to delete mentor assignments:', assignmentError)
        // Continue anyway - assignments might not exist
      }

      // Also delete any mentor feedback
      const { error: feedbackError } = await supabaseAdmin
        .from('mentor_feedback')
        .delete()
        .eq('mentor_id', userId)

      if (feedbackError) {
        console.error('Failed to delete mentor feedback:', feedbackError)
        // Continue anyway
      }
    }

    // If jury, delete their scores first
    if (role === 'jury') {
      const { error: scoresError } = await supabaseAdmin
        .from('jury_scores')
        .delete()
        .eq('jury_id', userId)

      if (scoresError) {
        console.error('Failed to delete jury scores:', scoresError)
        // Continue anyway
      }
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Failed to delete profile:', profileError)
      return { success: false, error: profileError.message }
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Failed to delete auth user:', authError)
      return { success: false, error: authError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    return { success: false, error: error.message || 'Unknown error occurred' }
  }
}
