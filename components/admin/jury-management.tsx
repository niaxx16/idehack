'use client'

import { useState, useEffect } from 'react'
import { Profile, Event } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Plus, UserCheck, Loader2, Copy, Gavel } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface JuryManagementProps {
  event: Event | null
  onUpdate: () => void
}

export function JuryManagement({ event, onUpdate }: JuryManagementProps) {
  const [juryMembers, setJuryMembers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const supabase = createClient()

  // Form fields
  const [juryName, setJuryName] = useState('')
  const [juryEmail, setJuryEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Credentials to show after creation
  const [createdEmail, setCreatedEmail] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')

  useEffect(() => {
    if (event?.id) {
      loadJuryMembers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id])

  // Real-time subscription for jury updates
  useEffect(() => {
    const channel = supabase
      .channel('jury-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.jury'
        },
        (payload) => {
          console.log('Jury updated:', payload)
          loadJuryMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const loadJuryMembers = async () => {
    setIsLoading(true)
    try {
      // Get all jury members (event_id NULL or matching current event)
      const { data: juryProfiles, error: juryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'jury')
        .or(`event_id.is.null,event_id.eq.${event?.id}`)
        .order('created_at', { ascending: false })

      if (juryError) throw juryError

      setJuryMembers(juryProfiles || [])
    } catch (err: any) {
      console.error('Failed to load jury members:', err)
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

  const createJury = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!juryName || !juryEmail || !event?.id) return

    setIsCreating(true)
    setError(null)

    try {
      // Generate a random 8-character password with uppercase, lowercase, and numbers
      const randomPassword = generatePassword()

      // Create auth user via Supabase Admin API (sign up)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: juryEmail,
        password: randomPassword,
        options: {
          data: {
            full_name: juryName,
            role: 'jury',
          },
        },
      })

      if (authError) throw authError

      // Manually create the profile (trigger is disabled)
      if (authData.user) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            role: 'jury',
            full_name: juryName,
            email: juryEmail,
            display_name: juryName,
            wallet_balance: 1000,
            event_id: event.id
          })

        if (insertError) {
          console.error('Profile insert error:', insertError)
          throw insertError
        }
      }

      // Show password to admin in a copyable dialog
      setCreatedEmail(juryEmail)
      setCreatedPassword(randomPassword)
      setShowCredentialsDialog(true)

      setJuryName('')
      setJuryEmail('')
      setShowCreateDialog(false)
      loadJuryMembers()
    } catch (err: any) {
      console.error('Failed to create jury:', err)
      setError(err.message || 'Failed to create jury member')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Jury Management
              </CardTitle>
              <CardDescription>
                Create and manage jury members who will score team presentations
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Jury Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Jury Member</DialogTitle>
                  <DialogDescription>
                    Add a new jury member to evaluate team presentations
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createJury} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="juryName">Full Name</Label>
                    <Input
                      id="juryName"
                      placeholder="e.g., Dr. Jane Smith"
                      value={juryName}
                      onChange={(e) => setJuryName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="juryEmail">Email</Label>
                    <Input
                      id="juryEmail"
                      type="email"
                      placeholder="e.g., jury@example.com"
                      value={juryEmail}
                      onChange={(e) => setJuryEmail(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <Button type="submit" disabled={isCreating} className="w-full">
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Jury Member'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Jury Member Created Successfully</DialogTitle>
            <DialogDescription>
              Save these credentials and share them with the jury member. They cannot be recovered later.
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
                  onClick={() => navigator.clipboard.writeText(createdEmail)}
                  title="Copy email"
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
                  onClick={() => navigator.clipboard.writeText(createdPassword)}
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Make sure to save this password! It won't be shown again.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Jury Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Jury Members ({juryMembers.length})</CardTitle>
          <CardDescription>
            All registered jury members for this hackathon
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : juryMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gavel className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No jury members yet</p>
              <p className="text-sm">Create your first jury member to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {juryMembers.map((jury) => (
                <Card key={jury.id} className="bg-slate-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{jury.full_name || 'Anonymous Jury'}</h3>
                          <p className="text-sm text-muted-foreground">{jury.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Jury
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
