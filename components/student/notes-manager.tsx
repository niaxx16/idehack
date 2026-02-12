'use client'

import { useEffect, useState } from 'react'
import { Event, Team } from '@/types'
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
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [notes, setNotes] = useState<Record<string, { text: string; rating: number }>>({})
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (user && event.id && event.current_team_id) {
      loadPitchTeamAndNote()
    } else {
      setCurrentTeam(null)
    }
  }, [user, event.id, event.current_team_id])

  const loadPitchTeamAndNote = async () => {
    if (!user) return

    // Load currently pitching team
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', event.current_team_id)
      .maybeSingle()

    setCurrentTeam(teamData || null)

    if (!event.current_team_id) return

    // Load current user's note for pitching team
    const { data: noteData } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('target_team_id', event.current_team_id)
      .maybeSingle()

    if (noteData) {
      setNotes({
        [event.current_team_id]: {
          text: noteData.note_text || '',
          rating: noteData.temp_rating || 5,
        },
      })
    } else {
      setNotes({
        [event.current_team_id]: { text: '', rating: 5 },
      })
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

  if (!event.current_team_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Team Pitching</CardTitle>
          <CardDescription>Notes are available when a team starts pitching.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!currentTeam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Team...</CardTitle>
          <CardDescription>Please wait while we fetch the current pitching team.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const teamNote = notes[currentTeam.id] || { text: '', rating: 5 }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Notes</CardTitle>
          <CardDescription>
            Take private notes for the team currently pitching.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{currentTeam.name}</CardTitle>
              <CardDescription>Table {currentTeam.table_number}</CardDescription>
            </div>
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
              Now Pitching
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`note-${currentTeam.id}`}>Notes</Label>
            <Textarea
              id={`note-${currentTeam.id}`}
              placeholder="Your private notes about this team..."
              rows={3}
              value={teamNote.text}
              onChange={(e) => updateNote(currentTeam.id, 'text', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`rating-${currentTeam.id}`}>
              Quick Rating: {teamNote.rating}/10
            </Label>
            <input
              id={`rating-${currentTeam.id}`}
              type="range"
              min="1"
              max="10"
              value={teamNote.rating}
              onChange={(e) => updateNote(currentTeam.id, 'rating', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <Button
            onClick={() => saveNote(currentTeam.id)}
            disabled={isSaving === currentTeam.id}
            size="sm"
            className="w-full"
          >
            {isSaving === currentTeam.id ? (
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
    </div>
  )
}
