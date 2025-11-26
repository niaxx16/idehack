'use client'

import { useEffect, useState } from 'react'
import { Event, Team } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useHype } from '@/hooks/use-hype'
import { useAuth } from '@/hooks/use-auth'
import { Flame, HandMetal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface PitchViewerProps {
  event: Event
}

export function PitchViewer({ event }: PitchViewerProps) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const { sendHype, hypeEvents } = useHype(event.id)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (event.current_team_id) {
      loadCurrentTeam()
    } else {
      setCurrentTeam(null)
    }
  }, [event.current_team_id])

  useEffect(() => {
    if (event.pitch_timer_end) {
      const endTime = new Date(event.pitch_timer_end).getTime()
      const updateTimer = () => {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
        setTimeRemaining(remaining)
      }

      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    } else {
      setTimeRemaining(0)
    }
  }, [event.pitch_timer_end])

  const loadCurrentTeam = async () => {
    if (!event.current_team_id) return

    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', event.current_team_id)
      .single()

    if (data) setCurrentTeam(data)
  }

  const handleHype = (type: 'clap' | 'fire') => {
    if (user) {
      sendHype(type, user.id)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentTeam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Team Pitching</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Waiting for the next pitch...</p>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = (timeRemaining / (3 * 60)) * 100

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center pb-3">
          <Badge className="mx-auto mb-2 w-fit">Now Pitching</Badge>
          <CardTitle className="text-3xl">{currentTeam.name}</CardTitle>
          <p className="text-muted-foreground">Table {currentTeam.table_number}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Time Remaining</span>
              <span className={`text-2xl font-mono font-bold ${
                timeRemaining < 30 ? 'text-red-600' : ''
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1 text-sm">Problem</h4>
            <p className="text-sm text-muted-foreground">
              {currentTeam.canvas_data.problem || 'Not specified'}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-sm">Solution</h4>
            <p className="text-sm text-muted-foreground">
              {currentTeam.canvas_data.solution || 'Not specified'}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-sm">Target Audience</h4>
            <p className="text-sm text-muted-foreground">
              {currentTeam.canvas_data.target_audience || 'Not specified'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Show Your Support!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleHype('clap')}
              variant="outline"
              className="h-20 text-lg"
            >
              <HandMetal className="mr-2 h-6 w-6" />
              Clap
            </Button>
            <Button
              onClick={() => handleHype('fire')}
              variant="outline"
              className="h-20 text-lg"
            >
              <Flame className="mr-2 h-6 w-6" />
              Fire
            </Button>
          </div>

          {/* Show hype animations */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {hypeEvents.map((hype) => (
              <div
                key={hype.timestamp}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 80 + 10}%`,
                  top: '100%',
                  fontSize: '3rem',
                  animation: 'float 3s ease-out forwards',
                }}
              >
                {hype.type === 'clap' ? '👏' : '🔥'}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}
