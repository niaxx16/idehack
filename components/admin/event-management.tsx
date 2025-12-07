'use client'

import { useState, useEffect } from 'react'
import { Event, Profile } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Plus, Calendar, Trash2, CheckCircle, Circle, Loader2, Globe, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { locales, localeNames, localeFlags, defaultLocale } from '@/lib/i18n/config'
import { useTranslations } from 'next-intl'

interface EventManagementProps {
  currentEvent: Event | null
  onEventSelect: (event: Event) => void
  onUpdate: () => void
  adminProfile?: Profile | null
}

export function EventManagement({ currentEvent, onEventSelect, onUpdate, adminProfile }: EventManagementProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const supabase = createClient()
  const t = useTranslations('admin')

  // Form fields
  const [eventName, setEventName] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventLanguage, setEventLanguage] = useState(defaultLocale)
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
      // Get current user id for created_by field
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('events')
        .insert({
          name: eventName.trim(),
          description: eventDescription.trim() || null,
          language: eventLanguage,
          status: 'WAITING',
          current_team_id: null,
          created_by: user?.id || null,
        })
        .select()
        .single()

      if (error) throw error

      setEventName('')
      setEventDescription('')
      setEventLanguage(defaultLocale)
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

  const openEditDialog = (event: Event) => {
    setEditingEvent(event)
    setEventName(event.name)
    setEventDescription(event.description || '')
    setEventLanguage(event.language || defaultLocale)
    setShowEditDialog(true)
  }

  const updateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventName.trim() || !editingEvent) return

    setIsCreating(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: eventName.trim(),
          description: eventDescription.trim() || null,
          language: eventLanguage,
        })
        .eq('id', editingEvent.id)

      if (error) throw error

      setEventName('')
      setEventDescription('')
      setEventLanguage(defaultLocale)
      setShowEditDialog(false)
      setEditingEvent(null)
      await loadEvents()

      // If edited event was the current one, refresh current event
      if (currentEvent?.id === editingEvent.id) {
        const updatedEvent = await supabase
          .from('events')
          .select('*')
          .eq('id', editingEvent.id)
          .single()

        if (updatedEvent.data) {
          onEventSelect(updatedEvent.data)
        }
      }

      onUpdate()
    } catch (err: any) {
      console.error('Failed to update event:', err)
      setError(err.message || 'Failed to update event')
    } finally {
      setIsCreating(false)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm(t('eventList.confirmDelete'))) {
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
                {t('eventHeader.title')}
              </CardTitle>
              <CardDescription>
                {t('eventHeader.description')}
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('eventHeader.createButton')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('eventForm.createEvent')}</DialogTitle>
                  <DialogDescription>
                    {t('eventForm.startNewEvent')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventName">{t('eventForm.eventNameRequired')}</Label>
                    <Input
                      id="eventName"
                      placeholder={t('eventForm.placeholder')}
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventDescription">{t('eventForm.descriptionOptional')}</Label>
                    <Textarea
                      id="eventDescription"
                      placeholder={t('eventForm.descriptionPlaceholder')}
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventLanguage">
                      <Globe className="h-4 w-4 inline mr-1" />
                      {t('eventForm.eventLanguageRequired')}
                    </Label>
                    <Select value={eventLanguage} onValueChange={setEventLanguage}>
                      <SelectTrigger id="eventLanguage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locales.map((locale) => (
                          <SelectItem key={locale} value={locale}>
                            {localeFlags[locale]} {localeNames[locale]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('eventForm.languageHint')}
                    </p>
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <Button type="submit" disabled={isCreating} className="w-full">
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('eventForm.creating')}
                      </>
                    ) : (
                      t('eventForm.createEvent')
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open)
        if (!open) {
          setEditingEvent(null)
          setEventName('')
          setEventDescription('')
          setEventLanguage(defaultLocale)
          setError(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('eventForm.editEvent')}</DialogTitle>
            <DialogDescription>
              {t('eventForm.updateDetails')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEventName">{t('eventForm.eventNameRequired')}</Label>
              <Input
                id="editEventName"
                placeholder={t('eventForm.placeholder')}
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEventDescription">{t('eventForm.descriptionOptional')}</Label>
              <Textarea
                id="editEventDescription"
                placeholder={t('eventForm.descriptionPlaceholder')}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEventLanguage">
                <Globe className="h-4 w-4 inline mr-1" />
                {t('eventForm.eventLanguageRequired')}
              </Label>
              <Select value={eventLanguage} onValueChange={setEventLanguage}>
                <SelectTrigger id="editEventLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      {localeFlags[locale]} {localeNames[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('eventForm.languageHint')}
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('eventForm.updating')}
                </>
              ) : (
                t('eventForm.updateEvent')
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('eventList.title')} ({events.length})</CardTitle>
          <CardDescription>
            {t('eventList.description')}
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
              <p>{t('eventList.noEvents')}</p>
              <p className="text-sm">{t('eventList.createFirst')}</p>
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
                                {t('eventList.active')}
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
                              <span>{t('eventList.created')} {formatDate(event.created_at)}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                            {event.language && (
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <span>
                                  {localeFlags[event.language as keyof typeof localeFlags] || ''}
                                  {' '}
                                  {localeNames[event.language as keyof typeof localeNames] || event.language}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(event)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteEvent(event.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
