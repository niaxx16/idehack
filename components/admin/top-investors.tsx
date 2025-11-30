'use client'

import { useEffect, useState } from 'react'
import { Event, TopInvestorEntry } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Award, DollarSign, Target, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TopInvestorsProps {
  event: Event | null
}

export function TopInvestors({ event }: TopInvestorsProps) {
  const [investors, setInvestors] = useState<TopInvestorEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!event) return

    loadTopInvestors()

    // Refresh every 10 seconds
    const interval = setInterval(loadTopInvestors, 10000)
    return () => clearInterval(interval)
  }, [event])

  const loadTopInvestors = async () => {
    if (!event) return

    try {
      const { data, error } = await supabase.rpc('get_top_investors', {
        event_id_input: event.id,
      })

      if (error) throw error
      setInvestors(data || [])
    } catch (error) {
      console.error('Failed to load top investors:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Award className="h-5 w-5 text-gray-400" />
      case 3:
        return <TrendingUp className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300'
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
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Top Investors
        </CardTitle>
        <CardDescription>
          Students who made the smartest investments in winning teams (3x for 1st, 2x for 2nd, 1x for 3rd)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : investors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No investments yet. Wait for students to invest in teams during the voting phase.
          </div>
        ) : (
          <div className="space-y-4">
            {investors.map((investor, index) => (
              <Card
                key={investor.investor_id}
                className={`${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                    : 'bg-background'
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {/* Rank Icon */}
                    <div className="flex-shrink-0 w-10 flex items-center justify-center">
                      {getRankIcon(index + 1)}
                    </div>

                    {/* Investor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {investor.investor_name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {investor.investor_team_name}
                        </Badge>
                      </div>

                      {/* Investments Detail */}
                      <div className="space-y-2 mt-3">
                        {investor.winning_investments.map((investment) => (
                          <div
                            key={investment.team_id}
                            className="flex items-center justify-between text-sm bg-white/60 rounded-lg px-3 py-2 border"
                          >
                            <div className="flex items-center gap-2">
                              <Badge className={getRankBadgeColor(investment.rank)}>
                                #{investment.rank}
                              </Badge>
                              <span className="font-medium">{investment.team_name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <DollarSign className="h-3 w-3" />
                                <span>{investment.amount}</span>
                              </div>
                              <div className="flex items-center gap-1 text-green-600 font-semibold">
                                <Target className="h-3 w-3" />
                                <span>×{investment.multiplier}</span>
                              </div>
                              <div className="text-purple-600 font-bold">
                                = {investment.amount * investment.multiplier}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Total Invested:</span>
                          <span className="font-semibold">{investor.total_invested}</span>
                        </div>
                      </div>
                    </div>

                    {/* ROI Score */}
                    <div className="text-right flex-shrink-0">
                      <Badge variant="outline" className="text-lg font-bold px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300">
                        {investor.roi_score}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">ROI Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
