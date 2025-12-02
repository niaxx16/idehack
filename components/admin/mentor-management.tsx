'use client'

import { useState, useEffect } from 'react'
import { Event, Team, Profile, MentorAssignment } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, Loader2, UserCheck, Mail, Copy, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { createUser } from '@/app/actions/create-user'

interface MentorManagementProps {
  event: Event | null
  teams: Team[]
  onUpdate: () => void
}

interface MentorWithAssignments extends Profile {
  assignment_count: number
  assigned_teams: string[]
}

export function MentorManagement({ event, teams, onUpdate }: MentorManagementProps) {
  const [mentors, setMentors] = useState<MentorWithAssignments[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const supabase = createClient()

  // Form fields
  const [mentorName, setMentorName] = useState('')
  const [mentorEmail, setMentorEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Credentials to show after creation
  const [createdEmail, setCreatedEmail] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')

  useEffect(() => {
    if (event?.id) {
      loadMentors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id])

  // Real-time subscription for mentor assignments and profiles
  useEffect(() => {
    const channel = supabase
      .channel('mentor-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_assignments'
        },
        () => {
          loadMentors()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.mentor'
        },
        () => {
          loadMentors()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const loadMentors = async () => {
    setIsLoading(true)
    try {
      // Get all mentors (event_id NULL or matching current event)
      const { data: mentorProfiles, error: mentorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mentor')
        .or(`event_id.is.null,event_id.eq.${event?.id}`)
        .order('created_at', { ascending: false })

      if (mentorError) throw mentorError

      // Get mentor assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from('mentor_assignments')
        .select('mentor_id, team_id')

      if (assignmentError) throw assignmentError

      // Combine data
      const mentorsWithAssignments: MentorWithAssignments[] = (mentorProfiles || []).map((mentor) => {
        const mentorAssignments = (assignments || []).filter((a) => a.mentor_id === mentor.id)
        return {
          ...mentor,
          assignment_count: mentorAssignments.length,
          assigned_teams: mentorAssignments.map((a) => a.team_id),
        }
      })

      setMentors(mentorsWithAssignments)
    } catch (err: any) {
      console.error('Failed to load mentors:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const allChars = uppercase + lowercase + numbers

    let password = ''
    // Ensure at least one uppercase letter
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    // Ensure at least one lowercase letter
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    // Ensure at least one number
    password += numbers[Math.floor(Math.random() * numbers.length)]

    // Fill remaining 5 characters randomly
    for (let i = 0; i < 5; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password characters
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  const createMentor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentorName || !mentorEmail || !event?.id) return

    setIsCreating(true)
    setError(null)

    try {
      // Generate a random 8-character password with uppercase, lowercase, and numbers
      const randomPassword = generatePassword()

      // Create user via server action (using admin API)
      const result = await createUser({
        email: mentorEmail,
        password: randomPassword,
        fullName: mentorName,
        role: 'mentor',
        eventId: event.id
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create mentor')
      }

      // Show password to admin in a copyable dialog
      setCreatedEmail(mentorEmail)
      setCreatedPassword(randomPassword)
      setShowCredentialsDialog(true)

      setMentorName('')
      setMentorEmail('')
      setShowCreateDialog(false)
      loadMentors()
    } catch (err: any) {
      console.error('Failed to create mentor:', err)
      setError(err.message || 'Failed to create mentor')
    } finally {
      setIsCreating(false)
    }
  }

  const assignMentorToTeam = async (mentorId: string, teamId: string) => {
    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('mentor_assignments')
        .select('id')
        .eq('mentor_id', mentorId)
        .eq('team_id', teamId)
        .single()

      if (existing) {
        // Already assigned, do nothing
        return
      }

      // Create assignment
      const { error } = await supabase.from('mentor_assignments').insert({
        mentor_id: mentorId,
        team_id: teamId,
      })

      if (error) throw error

      loadMentors()
      onUpdate()
    } catch (err: any) {
      console.error('Failed to assign mentor:', err)
      alert('Failed to assign mentor: ' + err.message)
    }
  }

  const unassignMentorFromTeam = async (mentorId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from('mentor_assignments')
        .delete()
        .eq('mentor_id', mentorId)
        .eq('team_id', teamId)

      if (error) throw error

      loadMentors()
      onUpdate()
    } catch (err: any) {
      console.error('Failed to unassign mentor:', err)
      alert('Failed to unassign mentor: ' + err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Mentor */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-900">Mentor Management</CardTitle>
              <CardDescription>Create mentors and assign them to teams</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Mentor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Mentor</DialogTitle>
                  <DialogDescription>
                    Create a mentor account. A random password will be generated.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createMentor} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mentorName">Full Name</Label>
                    <Input
                      id="mentorName"
                      placeholder="e.g., Dr. Ayşe Yılmaz"
                      value={mentorName}
                      onChange={(e) => setMentorName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mentorEmail">Email</Label>
                    <Input
                      id="mentorEmail"
                      type="email"
                      placeholder="e.g., ayse@example.com"
                      value={mentorEmail}
                      onChange={(e) => setMentorEmail(e.target.value)}
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <Button type="submit" disabled={isCreating} className="w-full">
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Mentor'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Mentors List */}
      <Card>
        <CardHeader>
          <CardTitle>Mentors ({mentors.length})</CardTitle>
          <CardDescription>View and manage mentor assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {mentors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No mentors yet. Create your first mentor above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mentors.map((mentor) => (
                <Card key={mentor.id} className="border-purple-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{mentor.full_name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{mentor.email}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {mentor.assignment_count} team{mentor.assignment_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Assigned Teams</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {teams.map((team) => {
                          const isAssigned = mentor.assigned_teams.includes(team.id)
                          return (
                            <Button
                              key={team.id}
                              variant={isAssigned ? 'default' : 'outline'}
                              size="sm"
                              onClick={() =>
                                isAssigned
                                  ? unassignMentorFromTeam(mentor.id, team.id)
                                  : assignMentorToTeam(mentor.id, team.id)
                              }
                              className="justify-start"
                            >
                              {team.name}
                            </Button>
                          )
                        })}
                      </div>
                      {teams.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No teams available. Create teams first.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mentor Created Successfully!</DialogTitle>
            <DialogDescription>
              Save these credentials and share them with the mentor securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex gap-2">
                <Input value={createdEmail} readOnly className="font-mono" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(createdEmail)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Password (Save this!)</Label>
              <div className="flex gap-2">
                <Input value={createdPassword} readOnly className="font-mono" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(createdPassword)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Important:</strong> This password will not be shown again. Copy it now and share it with the mentor securely.
              </p>
            </div>

            <Button
              onClick={() => setShowCredentialsDialog(false)}
              className="w-full"
            >
              I've Saved the Credentials
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
