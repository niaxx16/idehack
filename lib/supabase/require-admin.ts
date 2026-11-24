import { createClient } from '@/lib/supabase/server'

/**
 * Server-side guard for admin-only server actions. Mirrors the /admin check in
 * middleware.ts: a signed-in profile with role 'admin' whose access has not
 * expired (super admins never expire). Returns an error message, or null when
 * the caller is allowed.
 */
export async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Oturum bulunamadı. Lütfen yeniden giriş yapın.'

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, expiration_date, is_super_admin')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return 'Bu işlem için admin yetkisi gerekiyor.'

  if (!profile.is_super_admin && profile.expiration_date && new Date(profile.expiration_date) < new Date()) {
    return 'Admin yetkinizin süresi dolmuş.'
  }

  return null
}
