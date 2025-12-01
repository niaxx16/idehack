'use client'

import { useState, useEffect } from 'react'
import { Event, Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { Play, Pause, ExternalLink, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useHype } from '@/hooks/use-hype'

interface PitchControlProps {
  event: Event | null
  teams: Team[]
  onUpdate: () => void
}

const PITCH_DURATION = 3 * 60 // 3 minutes in seconds

export function PitchControl({ event, teams, onUpdate }: PitchControlProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [isStarting, setIsStarting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const supabase = createClient()
  const { hypeEvents } = useHype(event?.id || null)

  const currentTeam = teams.find((t) => t.id === event?.current_team_id)

  useEffect(() => {
    if (event?.pitch_timer_end) {
      const endTime = new Date(event.pitch_timer_end).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))

      setTimeRemaining(remaining)
      setIsTimerActive(remaining > 0)
    } else {
      setTimeRemaining(0)
      setIsTimerActive(false)
    }
  }, [event])

  useEffect(() => {
    if (!isTimerActive || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1
        if (newTime <= 0) {
          setIsTimerActive(false)
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerActive, timeRemaining])

  const startPitch = async () => {
    if (!event || !selectedTeamId) return

    setIsStarting(true)
    try {
      const endTime = new Date(Date.now() + PITCH_DURATION * 1000)

      const { error } = await supabase
        .from('events')
        .update({
          current_team_id: selectedTeamId,
          pitch_timer_end: endTime.toISOString(),
        })
        .eq('id', event.id)

      if (error) throw error

      onUpdate()
      setIsTimerActive(true)
    } catch (error) {
      console.error('Failed to start pitch:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const stopPitch = async () => {
    if (!event) return

    setIsStarting(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({
          current_team_id: null,
          pitch_timer_end: null,
        })
        .eq('id', event.id)

      if (error) throw error

      onUpdate()
      setIsTimerActive(false)
      setTimeRemaining(0)
    } catch (error) {
      console.error('Failed to stop pitch:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const openPresentation = () => {
    if (currentTeam?.presentation_url) {
      window.open(currentTeam.presentation_url, '_blank')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = (timeRemaining / PITCH_DURATION) * 100

  return (
    <div className="space-y-6 relative">
      {/* Emoji Animations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {hypeEvents.map((hype) => (
          <div
            key={hype.timestamp}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: '100%',
              fontSize: '4rem',
              animation: 'float 3s ease-out forwards',
            }}
          >
            {hype.type === 'clap' ? '👏' : '🔥'}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-100vh) scale(1.5);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 3s ease-out forwards;
        }
      `}</style>

      <Card>
        <CardHeader>
          <CardTitle>Pitch Control</CardTitle>
          <CardDescription>
            Select a team and start their pitch timer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!currentTeam ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Team to Pitch</label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} (Table {team.table_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={startPitch}
                disabled={!selectedTeamId || isStarting}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Pitch Timer
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Badge className="mb-2">Now Pitching</Badge>
                <h3 className="text-2xl font-bold">{currentTeam.name}</h3>
                <p className="text-muted-foreground">Table {currentTeam.table_number}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Remaining
                  </span>
                  <span className={`text-2xl font-mono font-bold ${
                    timeRemaining < 30 ? 'text-red-600' : 'text-primary'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currentTeam.presentation_url && (
                  <Button onClick={openPresentation} variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Presentation
                  </Button>
                )}
                <Button
                  onClick={stopPitch}
                  variant="destructive"
                  disabled={isStarting}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Pitch
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Problem</h4>
              <p className="text-sm text-muted-foreground">
                {currentTeam.canvas_data.problem || 'Not specified'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Solution</h4>
              <p className="text-sm text-muted-foreground">
                {currentTeam.canvas_data.solution || 'Not specified'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Target Audience</h4>
              <p className="text-sm text-muted-foreground">
                {currentTeam.canvas_data.target_audience || 'Not specified'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Revenue Model</h4>
              <p className="text-sm text-muted-foreground">
                {currentTeam.canvas_data.revenue_model || 'Not specified'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
