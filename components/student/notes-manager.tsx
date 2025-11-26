'use client'

import { useEffect, useState } from 'react'
import { Event, Team, UserNote } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Save, Loader2 } from 'lucide-react'

interface NotesManagerProps {
  event: Event
}

export function NotesManager({ event }: NotesManagerProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [notes, setNotes] = useState<Record<string, { text: string; rating: number }>>({})
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (event.id) {
      loadTeamsAndNotes()
    }
  }, [event.id])

  const loadTeamsAndNotes = async () => {
    if (!user) return

    // Load all teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', event.id)
      .order('table_number')

    if (teamsData) {
      setTeams(teamsData)

      // Load user's notes for these teams
      const { data: notesData } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id)
        .in('target_team_id', teamsData.map(t => t.id))

      if (notesData) {
        const notesMap: Record<string, { text: string; rating: number }> = {}
        notesData.forEach((note: UserNote) => {
          notesMap[note.target_team_id] = {
            text: note.note_text || '',
            rating: note.temp_rating || 5,
          }
        })
        setNotes(notesMap)
      }
    }
  }

  const updateNote = (teamId: string, field: 'text' | 'rating', value: string | number) => {
    setNotes((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: value,
      },
    }))
  }

  const saveNote = async (teamId: string) => {
    if (!user) return

    setIsSaving(teamId)

    try {
      const noteData = notes[teamId] || { text: '', rating: 5 }

      const { error } = await supabase
        .from('user_notes')
        .upsert({
          user_id: user.id,
          target_team_id: teamId,
          note_text: noteData.text,
          temp_rating: noteData.rating,
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(null)
    }
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Teams Yet</CardTitle>
          <CardDescription>Teams will appear here once they're created</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Notes</CardTitle>
          <CardDescription>
            Take private notes about each team. These are only visible to you.
          </CardDescription>
        </CardHeader>
      </Card>

      {teams.map((team) => {
        const teamNote = notes[team.id] || { text: '', rating: 5 }
        const isCurrentlyPitching = event.current_team_id === team.id

        return (
          <Card key={team.id} className={isCurrentlyPitching ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription>Table {team.table_number}</CardDescription>
                </div>
                {isCurrentlyPitching && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Now Pitching
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`note-${team.id}`}>Notes</Label>
                <Textarea
                  id={`note-${team.id}`}
                  placeholder="Your private notes about this team..."
                  rows={3}
                  value={teamNote.text}
                  onChange={(e) => updateNote(team.id, 'text', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`rating-${team.id}`}>
                  Quick Rating: {teamNote.rating}/10
                </Label>
                <input
                  id={`rating-${team.id}`}
                  type="range"
                  min="1"
                  max="10"
                  value={teamNote.rating}
                  onChange={(e) => updateNote(team.id, 'rating', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <Button
                onClick={() => saveNote(team.id)}
                disabled={isSaving === team.id}
                size="sm"
                className="w-full"
              >
                {isSaving === team.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Note
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
