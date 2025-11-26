'use client'

import { Event, Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Video } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StreamViewerProps {
  event: Event
  team: Team
}

export function StreamViewer({ event, team }: StreamViewerProps) {
  const [streamUrl, setStreamUrl] = useState(event.stream_url || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  const updateStreamUrl = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({ stream_url: streamUrl })
        .eq('id', event.id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update stream URL:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getEmbedUrl = (url: string) => {
    // Convert YouTube watch URL to embed URL
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v')
      return `https://www.youtube.com/embed/${videoId}`
    }
    // Convert YouTube short URL to embed URL
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    // For Zoom or other embeddable URLs, return as is
    return url
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-2">Now Pitching</Badge>
              <CardTitle className="text-2xl">{team.name}</CardTitle>
              <CardDescription>Table {team.table_number}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {event.stream_url ? (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={getEmbedUrl(event.stream_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <Button
                variant="outline"
                onClick={() => window.open(event.stream_url!, '_blank')}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-3">
                <Video className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No stream URL configured
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Label htmlFor="streamUrl" className="text-xs">
              Stream URL (YouTube, Zoom, etc.)
            </Label>
            <div className="flex gap-2">
              <Input
                id="streamUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
              />
              <Button
                onClick={updateStreamUrl}
                disabled={isUpdating}
                size="sm"
              >
                Update
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Canvas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1 text-sm">Problem Statement</h4>
            <p className="text-sm text-muted-foreground">
              {team.canvas_data.problem || 'Not specified'}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-sm">Solution</h4>
            <p className="text-sm text-muted-foreground">
              {team.canvas_data.solution || 'Not specified'}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-sm">Target Audience</h4>
            <p className="text-sm text-muted-foreground">
              {team.canvas_data.target_audience || 'Not specified'}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1 text-sm">Revenue Model</h4>
            <p className="text-sm text-muted-foreground">
              {team.canvas_data.revenue_model || 'Not specified'}
            </p>
          </div>

          {team.presentation_url && (
            <Button
              variant="outline"
              onClick={() => window.open(team.presentation_url!, '_blank')}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Presentation
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
