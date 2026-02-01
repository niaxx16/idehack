'use client'

import { useEffect, useState } from 'react'
import { Event, LeaderboardEntry } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Medal, Award, Coins, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface LeaderboardProps {
  event: Event | null
}

export function Leaderboard({ event }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const t = useTranslations('admin.leaderboard')

  useEffect(() => {
    if (!event) return

    loadLeaderboard()

    // Refresh every 10 seconds
    const interval = setInterval(loadLeaderboard, 10000)
    return () => clearInterval(interval)
  }, [event])

  const loadLeaderboard = async () => {
    if (!event) return

    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        event_id_input: event.id,
      })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
    }
  }

  if (!event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Event Selected</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{t('noScores')}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('noScores')}
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.team_id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  index === 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : index === 1
                    ? 'bg-gray-50 border-gray-200'
                    : index === 2
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-background'
                }`}
              >
                <div className="flex-shrink-0 w-12 flex items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {entry.team_name}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>{t('jury')}: {(entry.jury_avg_score ?? 0).toFixed(1)}/100</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      <span>{t('investment')}: {entry.total_investment ?? 0} idecoin</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="outline" className="text-lg font-bold">
                    {(entry.final_score ?? 0).toFixed(2)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{t('finalScore')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
