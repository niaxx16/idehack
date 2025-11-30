'use client'

import { useState, useEffect } from 'react'
import { Event } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Plus, Calendar, Trash2, CheckCircle, Circle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EventManagementProps {
  currentEvent: Event | null
  onEventSelect: (event: Event) => void
  onUpdate: () => void
}

export function EventManagement({ currentEvent, onEventSelect, onUpdate }: EventManagementProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const supabase = createClient()

  // Form fields
  const [eventName, setEventName] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (err: any) {
      console.error('Failed to load events:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          name: eventName.trim(),
          description: eventDescription.trim() || null,
          status: 'WAITING',
          current_team_id: null,
        })
        .select()
        .single()

      if (error) throw error

      setEventName('')
      setEventDescription('')
      setShowCreateDialog(false)
      await loadEvents()

      // Auto-select newly created event
      if (data) {
        onEventSelect(data)
      }

      onUpdate()
    } catch (err: any) {
      console.error('Failed to create event:', err)
      setError(err.message || 'Failed to create event')
    } finally {
      setIsCreating(false)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all associated teams and data.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      await loadEvents()

      // If deleted event was the current one, clear selection
      if (currentEvent?.id === eventId) {
        onEventSelect(events.find(e => e.id !== eventId) || events[0])
      }

      onUpdate()
    } catch (err: any) {
      console.error('Failed to delete event:', err)
      alert('Failed to delete event: ' + err.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Management
              </CardTitle>
              <CardDescription>
                Create and manage hackathon/ideathon events
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Start a new hackathon or ideathon event
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event Name *</Label>
                    <Input
                      id="eventName"
                      placeholder="e.g., Spring 2024 Hackathon"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventDescription">Description (Optional)</Label>
                    <Textarea
                      id="eventDescription"
                      placeholder="Brief description of the event..."
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      rows={3}
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
                      'Create Event'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>All Events ({events.length})</CardTitle>
          <CardDescription>
            Click on an event to make it active. The active event will be used across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No events yet</p>
              <p className="text-sm">Create your first event to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    currentEvent?.id === event.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'hover:border-blue-200'
                  }`}
                  onClick={() => onEventSelect(event)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Active Indicator */}
                        <div className="flex-shrink-0 mt-1">
                          {currentEvent?.id === event.id ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg truncate">{event.name}</h3>
                            {currentEvent?.id === event.id && (
                              <Badge variant="default" className="bg-blue-600">
                                Active
                              </Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created: {formatDate(event.created_at)}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteEvent(event.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
