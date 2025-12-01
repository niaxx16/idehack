'use client'

import { useState } from 'react'
import { Event, EventStatus } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface EventControlProps {
  event: Event | null
  onUpdate: () => void
}

const statusColors: Record<EventStatus, string> = {
  WAITING: 'bg-gray-500',
  IDEATION: 'bg-blue-500',
  LOCKED: 'bg-yellow-500',
  PITCHING: 'bg-purple-500',
  VOTING: 'bg-green-500',
  COMPLETED: 'bg-red-500',
}

export function EventControl({ event, onUpdate }: EventControlProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()
  const t = useTranslations('admin.eventControl')

  const updateStatus = async (newStatus: EventStatus) => {
    if (!event) return

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event.id)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Event</CardTitle>
          <CardDescription>Please create an event first</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium mb-2">{t('currentStatus')}</p>
          <Badge className={statusColors[event.status]}>
            {t(`statuses.${event.status}`)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            variant={event.status === 'WAITING' ? 'default' : 'outline'}
            onClick={() => updateStatus('WAITING')}
            disabled={isUpdating || event.status === 'WAITING'}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('statuses.WAITING')}
          </Button>

          <Button
            variant={event.status === 'IDEATION' ? 'default' : 'outline'}
            onClick={() => updateStatus('IDEATION')}
            disabled={isUpdating || event.status === 'IDEATION'}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('statuses.IDEATION')}
          </Button>

          <Button
            variant={event.status === 'LOCKED' ? 'default' : 'outline'}
            onClick={() => updateStatus('LOCKED')}
            disabled={isUpdating || event.status === 'LOCKED'}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lock Submissions'}
          </Button>

          <Button
            variant={event.status === 'PITCHING' ? 'default' : 'outline'}
            onClick={() => updateStatus('PITCHING')}
            disabled={isUpdating || event.status === 'PITCHING'}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('statuses.PITCHING')}
          </Button>

          <Button
            variant={event.status === 'VOTING' ? 'default' : 'outline'}
            onClick={() => updateStatus('VOTING')}
            disabled={isUpdating || event.status === 'VOTING'}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('statuses.VOTING')}
          </Button>

          <Button
            variant={event.status === 'COMPLETED' ? 'default' : 'outline'}
            onClick={() => updateStatus('COMPLETED')}
            disabled={isUpdating || event.status === 'COMPLETED'}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete Event'}
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Phase Guidelines:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li><strong>Waiting:</strong> Teams can join and form</li>
            <li><strong>Ideation:</strong> Teams can edit canvas and upload presentations</li>
            <li><strong>Locked:</strong> No more edits allowed, preparing for pitches</li>
            <li><strong>Pitching:</strong> Teams present their projects</li>
            <li><strong>Voting:</strong> Students allocate their portfolio</li>
            <li><strong>Completed:</strong> Event finished, view results</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
