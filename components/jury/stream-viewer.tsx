'use client'

import { Event, Team, CanvasContributionWithUser } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Video, Crown, UserCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StreamViewerProps {
  event: Event
  team: Team
}

type CanvasSection = 'problem' | 'solution' | 'value_proposition' | 'target_audience' | 'key_features' | 'revenue_model'

export function StreamViewer({ event, team }: StreamViewerProps) {
  const [streamUrl, setStreamUrl] = useState(event.stream_url || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [contributions, setContributions] = useState<Record<CanvasSection, CanvasContributionWithUser[]>>({
    problem: [],
    solution: [],
    value_proposition: [],
    target_audience: [],
    key_features: [],
    revenue_model: [],
  })
  const supabase = createClient()

  const members = (team.team_members as any[]) || []

  useEffect(() => {
    loadContributions()
  }, [team.id])

  const loadContributions = async () => {
    try {
      console.log('Loading contributions for team:', team.id)
      console.log('Team members:', members)

      // Load contributions with profile information
      const { data, error } = await supabase
        .from('canvas_contributions')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            display_name,
            role
          )
        `)
        .eq('team_id', team.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading contributions:', error)
        throw error
      }

      console.log('Contributions data with profiles:', data)

      // Group by section and enrich with member info
      const grouped: Record<CanvasSection, CanvasContributionWithUser[]> = {
        problem: [],
        solution: [],
        value_proposition: [],
        target_audience: [],
        key_features: [],
        revenue_model: [],
      }

      ;(data || []).forEach((contrib: any) => {
        // Get member info from team_members JSON
        const member = members.find((m: any) => m.user_id === contrib.user_id)

        // Use profile info if available, otherwise fallback to member info
        const profile = contrib.profiles
        const memberName = profile?.display_name || profile?.full_name || member?.name || 'Unknown'
        const memberRole = member?.role || 'Student'
        const isCaptain = member?.is_captain || false

        console.log(`User ${contrib.user_id}: name=${memberName}, role=${memberRole}, captain=${isCaptain}`)

        const enriched = {
          ...contrib,
          member_name: memberName,
          member_role: memberRole,
          is_captain: isCaptain,
        }
        grouped[contrib.section as CanvasSection].push(enriched)
      })

      console.log('Grouped contributions:', grouped)
      setContributions(grouped)
    } catch (error) {
      console.error('Failed to load contributions:', error)
    }
  }

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
          <CardDescription>Team ideas and contributions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Problem */}
          <div>
            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <div className="w-1 h-4 bg-red-500 rounded"></div>
              Problem Statement
            </h4>
            {contributions.problem.length > 0 ? (
              <div className="space-y-2">
                {contributions.problem.map((contrib) => (
                  <div key={contrib.id} className="bg-red-50 border border-red-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                      <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                    </div>
                    <p className="text-sm">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No ideas yet</p>
            )}
          </div>

          {/* Solution */}
          <div>
            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <div className="w-1 h-4 bg-yellow-500 rounded"></div>
              Solution
            </h4>
            {contributions.solution.length > 0 ? (
              <div className="space-y-2">
                {contributions.solution.map((contrib) => (
                  <div key={contrib.id} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                      <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                    </div>
                    <p className="text-sm">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No ideas yet</p>
            )}
          </div>

          {/* Value Proposition */}
          <div>
            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-500 rounded"></div>
              Unique Value
            </h4>
            {contributions.value_proposition.length > 0 ? (
              <div className="space-y-2">
                {contributions.value_proposition.map((contrib) => (
                  <div key={contrib.id} className="bg-purple-50 border border-purple-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                      <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                    </div>
                    <p className="text-sm">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No ideas yet</p>
            )}
          </div>

          {/* Target Audience */}
          <div>
            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded"></div>
              Target Customers
            </h4>
            {contributions.target_audience.length > 0 ? (
              <div className="space-y-2">
                {contributions.target_audience.map((contrib) => (
                  <div key={contrib.id} className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                      <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                    </div>
                    <p className="text-sm">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No ideas yet</p>
            )}
          </div>

          {/* Key Features */}
          <div>
            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <div className="w-1 h-4 bg-green-500 rounded"></div>
              Key Features
            </h4>
            {contributions.key_features.length > 0 ? (
              <div className="space-y-2">
                {contributions.key_features.map((contrib) => (
                  <div key={contrib.id} className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                      <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                    </div>
                    <p className="text-sm">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No ideas yet</p>
            )}
          </div>

          {/* Revenue Model */}
          <div>
            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-500 rounded"></div>
              Revenue Model
            </h4>
            {contributions.revenue_model.length > 0 ? (
              <div className="space-y-2">
                {contributions.revenue_model.map((contrib) => (
                  <div key={contrib.id} className="bg-emerald-50 border border-emerald-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {contrib.is_captain ? (
                        <Crown className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <UserCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs font-medium">{contrib.member_name}</span>
                      <span className="text-xs text-muted-foreground">({contrib.member_role})</span>
                    </div>
                    <p className="text-sm">{contrib.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No ideas yet</p>
            )}
          </div>

          {team.presentation_url && (
            <Button
              variant="outline"
              onClick={() => window.open(team.presentation_url!, '_blank')}
              className="w-full mt-4"
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
