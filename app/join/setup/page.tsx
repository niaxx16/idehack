'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Users, Crown } from 'lucide-react'

export default function TeamSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [activationCode, setActivationCode] = useState('')
  const [userId, setUserId] = useState('')
  const [isFirstMember, setIsFirstMember] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [teamName, setTeamName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberRole, setMemberRole] = useState('')

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
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .select('captain_id, team_members')
        .eq('activation_code', code)
        .single()

      if (error) throw error

      // Check if this is the first member
      const isFirst = !team.captain_id
      setIsFirstMember(isFirst)
    } catch (err: any) {
      console.error('Check team status error:', err)
      setError('Invalid activation code. Please try again.')
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

    try {
      // Join team
      const { data: joinResult, error: joinError } = await supabase.rpc('join_team_by_code', {
        activation_code_input: activationCode,
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

      // Clear session storage
      sessionStorage.removeItem('pending_activation_code')
      sessionStorage.removeItem('pending_user_id')

      // Redirect to student dashboard
      router.push('/student')
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
