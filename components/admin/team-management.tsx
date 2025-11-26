'use client'

import { useState } from 'react'
import { Event, Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, FileText } from 'lucide-react'
import QRCode from 'qrcode.react'

interface TeamManagementProps {
  event: Event | null
  teams: Team[]
  onUpdate: () => void
}

export function TeamManagement({ event, teams, onUpdate }: TeamManagementProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamTable, setNewTeamTable] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const supabase = createClient()

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return

    setIsCreating(true)
    try {
      const { error } = await supabase.from('teams').insert({
        event_id: event.id,
        name: newTeamName,
        table_number: parseInt(newTeamTable),
      })

      if (error) throw error

      setNewTeamName('')
      setNewTeamTable('')
      onUpdate()
    } catch (error) {
      console.error('Failed to create team:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const joinUrl = selectedTeam
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?token=${selectedTeam.access_token}`
    : ''

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Team</CardTitle>
          <CardDescription>Add teams to the event</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTeam} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="e.g., Team Alpha"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tableNumber">Table Number</Label>
                <Input
                  id="tableNumber"
                  type="number"
                  placeholder="e.g., 1"
                  value={newTeamTable}
                  onChange={(e) => setNewTeamTable(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={isCreating || !event}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teams ({teams.length})</CardTitle>
          <CardDescription>Manage existing teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>Table {team.table_number}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Investment: ${team.total_investment}</span>
                  </div>
                  {team.presentation_url && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="h-4 w-4" />
                      <span>Presentation uploaded</span>
                    </div>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedTeam(team)}
                      >
                        Show QR Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{team.name} - Join QR Code</DialogTitle>
                        <DialogDescription>
                          Scan this QR code to join the team
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-col items-center space-y-4">
                        {selectedTeam?.id === team.id && (
                          <>
                            <div className="p-4 bg-white rounded-lg">
                              <QRCode
                                value={joinUrl}
                                size={256}
                                level="H"
                                includeMargin
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-mono break-all p-2 bg-muted rounded">
                                {joinUrl}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams yet. Create your first team above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
