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
import { QRCodeSVG } from 'qrcode.react'

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
  const [showAllQR, setShowAllQR] = useState(false)
  const [bulkCount, setBulkCount] = useState('')
  const [isBulkCreating, setIsBulkCreating] = useState(false)
  const supabase = createClient()

  const createBulkTeams = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !bulkCount) return

    const count = parseInt(bulkCount)
    if (count < 1 || count > 50) {
      alert('Please enter a number between 1 and 50')
      return
    }

    setIsBulkCreating(true)
    try {
      // Generate activation codes and create teams
      const teamsToCreate = []
      for (let i = 1; i <= count; i++) {
        const activationCode = generateActivationCode()
        teamsToCreate.push({
          event_id: event.id,
          name: `Masa ${i}`,
          table_number: i,
          activation_code: activationCode,
          is_activated: false,
          team_members: [],
        })
      }

      const { error } = await supabase.from('teams').insert(teamsToCreate)

      if (error) throw error

      setBulkCount('')
      onUpdate()
    } catch (error) {
      console.error('Failed to create teams:', error)
      alert('Failed to create teams. Please try again.')
    } finally {
      setIsBulkCreating(false)
    }
  }

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return

    setIsCreating(true)
    try {
      const activationCode = generateActivationCode()
      const { error } = await supabase.from('teams').insert({
        event_id: event.id,
        name: newTeamName,
        table_number: parseInt(newTeamTable),
        activation_code: activationCode,
        is_activated: false,
        team_members: [],
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

  const generateActivationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const joinUrl = selectedTeam
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?code=${selectedTeam.activation_code}`
    : ''

  return (
    <div className="space-y-6">
      {/* Bulk Team Creation */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900">Quick Setup: Create Multiple Teams</CardTitle>
          <CardDescription>Perfect for hackathon preparation - create all tables at once</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createBulkTeams} className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="bulkCount">Number of Teams (Tables)</Label>
                <Input
                  id="bulkCount"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="e.g., 20"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Teams will be named "Masa 1", "Masa 2", etc. Students will choose their own team names.
                </p>
              </div>
              <Button type="submit" disabled={isBulkCreating || !event} size="lg">
                {isBulkCreating ? 'Creating...' : 'Create Teams'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Single Team Creation */}
      <Card>
        <CardHeader>
          <CardTitle>Create Single Team</CardTitle>
          <CardDescription>Add one team manually</CardDescription>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teams ({teams.length})</CardTitle>
              <CardDescription>Manage existing teams</CardDescription>
            </div>
            {teams.length > 0 && (
              <Dialog open={showAllQR} onOpenChange={setShowAllQR}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    Print All QR Codes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>All Team Activation Codes & QR Codes</DialogTitle>
                    <DialogDescription>
                      Print and place these at each table. Students can either scan QR or enter the code.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4">
                    {teams.map((team) => {
                      const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?code=${team.activation_code}`
                      return (
                        <div key={team.id} className="flex flex-col items-center space-y-2 p-4 border-2 rounded-lg break-inside-avoid">
                          <h3 className="font-bold text-xl">{team.name}</h3>
                          <p className="text-sm text-muted-foreground">Table {team.table_number}</p>
                          <div className="p-4 bg-white rounded-lg border">
                            <QRCodeSVG
                              value={joinUrl}
                              size={200}
                              level="H"
                              includeMargin
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Activation Code:</p>
                            <p className="text-2xl font-bold font-mono tracking-wider">{team.activation_code}</p>
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            Scan QR or visit idehack.com/join
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-end gap-2 print:hidden">
                    <Button onClick={() => window.print()} variant="default">
                      Print
                    </Button>
                    <Button onClick={() => setShowAllQR(false)} variant="outline">
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className={team.is_activated ? 'border-green-200 bg-green-50/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>Table {team.table_number}</CardDescription>
                    </div>
                    {team.is_activated && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{team.team_members?.length || 0} members</span>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Activation Code:</p>
                    <p className="font-mono font-bold">{team.activation_code}</p>
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
                              <QRCodeSVG
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
