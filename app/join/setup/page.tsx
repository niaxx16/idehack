'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Users, Crown, CheckCircle, Key } from 'lucide-react'

export default function TeamSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [activationCode, setActivationCode] = useState('')
  const [userId, setUserId] = useState('')
  const [isFirstMember, setIsFirstMember] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [personalCode, setPersonalCode] = useState<string | null>(null)

  // Form fields
  const [teamName, setTeamName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberRole, setMemberRole] = useState('')

  const generateLocalPersonalCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  useEffect(() => {
    // Get activation code from session
    const code = sessionStorage.getItem('pending_activation_code')
    const uid = sessionStorage.getItem('pending_user_id')

    if (!code || !uid) {
      router.push('/join')
      return
    }

    setActivationCode(code)
    setUserId(uid)

    checkTeamStatus(code)
  }, [router])

  const checkTeamStatus = async (code: string) => {
    const normalizedCode = code.replace(/\s+/g, '').toUpperCase()
    try {
      // First, check if user is already in a team
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', user.id)
          .single()

        if (profile?.team_id) {
          // User is already in a team, redirect to dashboard
          router.push('/student')
          return
        }
      }

      // Check team status
      const { data: team, error } = await supabase
        .from('teams')
        .select('captain_id, team_members')
        .eq('activation_code', normalizedCode)
        .single()

      if (error) throw error

      // Check if this is the first member
      const isFirst = !team.captain_id
      setIsFirstMember(isFirst)
    } catch (err: any) {
      console.error('Check team status error:', {
        message: err?.message,
        code: err?.code,
        activationCode: normalizedCode,
      })
      setError(
        err?.message?.toLowerCase().includes('invalid')
          ? 'Invalid activation code. Please try again.'
          : 'Could not verify team right now. Please try again.'
      )
      setTimeout(() => router.push('/join'), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberName || !memberRole) return

    setIsSubmitting(true)
    setError(null)
    const normalizedCode = activationCode.replace(/\s+/g, '').toUpperCase()

    try {
      // Join team
      const { data: joinResult, error: joinError } = await supabase.rpc('join_team_by_code', {
        activation_code_input: normalizedCode,
        member_name: memberName,
        member_role: memberRole,
      })

      if (joinError) throw joinError

      // If first member (captain), set team name
      if (isFirstMember && teamName) {
        const { error: nameError } = await supabase.rpc('setup_team_name', {
          team_id_input: joinResult.team_id,
          new_team_name: teamName,
        })

        if (nameError) throw nameError
      }

      // Ensure personal code exists so rejoin code is visible in admin panel.
      let resolvedPersonalCode = joinResult?.personal_code as string | null
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user?.id && !resolvedPersonalCode) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('personal_code')
          .eq('id', authData.user.id)
          .single()

        resolvedPersonalCode = profileData?.personal_code || null
      }

      if (authData?.user?.id && !resolvedPersonalCode) {
        const { data: generatedCode } = await supabase.rpc('generate_personal_code')
        resolvedPersonalCode = (generatedCode as string) || generateLocalPersonalCode()
        await supabase
          .from('profiles')
          .update({ personal_code: resolvedPersonalCode })
          .eq('id', authData.user.id)
          .is('personal_code', null)
      }

      if (resolvedPersonalCode) {
        setPersonalCode(resolvedPersonalCode)
        setShowSuccess(true)
      } else {
        sessionStorage.removeItem('pending_activation_code')
        sessionStorage.removeItem('pending_user_id')
        router.push('/student')
      }
    } catch (err: any) {
      console.error('Join team error:', err)
      setError(err.message || 'Failed to join team. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // Success screen with personal code
  if (showSuccess && personalCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Welcome to Your Team!
            </CardTitle>
            <CardDescription>
              Save your personal code to rejoin later
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Code Display */}
            <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg border-2 border-purple-300">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Key className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-semibold text-purple-900">Your Personal Code</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold font-mono tracking-wider text-purple-900 mb-2">
                  {personalCode}
                </p>
                <p className="text-xs text-purple-700">
                  Save this code! You'll need it to rejoin if you sign out.
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Important</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Take a screenshot or write down this code</li>
                <li>• If you sign out, use this code at /rejoin to return</li>
                <li>• Don't share your code with others</li>
              </ul>
            </div>

            {/* Continue Button */}
            <Button
              onClick={() => {
                sessionStorage.removeItem('pending_activation_code')
                sessionStorage.removeItem('pending_user_id')
                router.push('/student')
              }}
              className="w-full"
              size="lg"
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isFirstMember ? (
            <>
              <div className="mx-auto mb-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                You're the Team Captain!
              </CardTitle>
              <CardDescription>
                Set up your team name and add your details
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-2 w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Join Your Team
              </CardTitle>
              <CardDescription>
                Enter your details to join the team
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isFirstMember && (
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="e.g., Innovation Wizards"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Choose a creative name for your team
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="memberName">Your Name</Label>
              <Input
                id="memberName"
                placeholder="e.g., Ahmet Yılmaz"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                required
                autoFocus={!isFirstMember}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberRole">Your Role</Label>
              <Select value={memberRole} onValueChange={setMemberRole} required>
                <SelectTrigger id="memberRole">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product Manager">Product Manager</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Marketer">Marketer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting || !memberName || !memberRole || (isFirstMember && !teamName)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : isFirstMember ? (
                'Create Team & Continue'
              ) : (
                'Join Team'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
