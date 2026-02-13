// Maps role keys to translation keys under common.roles
// Falls back to raw value for legacy data (e.g., "Product Manager")
const ROLE_KEYS = [
  'projectLeader',
  'researcher',
  'designer',
  'developer',
  'marketing',
  'strategy',
] as const

export function getRoleLabel(
  role: string,
  t: (key: string) => string
): string {
  if (ROLE_KEYS.includes(role as any)) {
    return t(`roles.${role}`)
  }
  // Legacy roles stored as display text - return as-is
  return role
}
