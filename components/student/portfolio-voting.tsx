'use client'

import { useEffect, useState } from 'react'
import { Event, Team, Profile, UserNote } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useVotingStore } from '@/stores/voting-store'
import { Coins, Loader2, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface PortfolioVotingProps {
  event: Event
  profile: Profile
}

export function PortfolioVoting({ event, profile }: PortfolioVotingProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [userNotes, setUserNotes] = useState<Record<string, UserNote>>({})
  const [hasVoted, setHasVoted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    votes,
    updateVote,
    getTotalAllocated,
    getVotesArray,
    clearVotes,
    isSubmitting,
    setSubmitting,
  } = useVotingStore()

  const supabase = createClient()
  const WALLET_BALANCE = profile.wallet_balance

  useEffect(() => {
    loadTeamsAndNotes()
    checkIfVoted()
  }, [event.id, profile.id])

  const loadTeamsAndNotes = async () => {
    // Load all teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', event.id)
      .order('table_number')

    if (teamsData) {
      setTeams(teamsData)

      // Load user's notes
      const { data: notesData } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', profile.id)
        .in('target_team_id', teamsData.map(t => t.id))

      if (notesData) {
        const notesMap: Record<string, UserNote> = {}
        notesData.forEach((note: UserNote) => {
          notesMap[note.target_team_id] = note
        })
        setUserNotes(notesMap)
      }
    }
  }

  const checkIfVoted = async () => {
    // Check if user has already made transactions
    const { data } = await supabase
      .from('transactions')
      .select('id')
      .eq('sender_id', profile.id)
      .limit(1)

    setHasVoted(!!data && data.length > 0)
  }

  const handleAmountChange = (teamId: string, value: string) => {
    const amount = parseInt(value) || 0
    updateVote(teamId, amount)
  }

  const submitVotes = async () => {
    const totalAllocated = getTotalAllocated()

    if (totalAllocated > WALLET_BALANCE) {
      setError(`You can't allocate more than ${WALLET_BALANCE} idecoin`)
      return
    }

    if (totalAllocated === 0) {
      setError('Please allocate some investment')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const votesArray = getVotesArray()

      const { data, error: rpcError } = await supabase.rpc('submit_portfolio', {
        votes: votesArray,
      })

      if (rpcError) throw rpcError

      if (data.success) {
        setHasVoted(true)
        clearVotes()
      } else {
        setError(data.error || 'Failed to submit votes')
      }
    } catch (error: any) {
      console.error('Failed to submit votes:', error)
      setError(error.message || 'Failed to submit votes')
    } finally {
      setSubmitting(false)
    }
  }

  const totalAllocated = getTotalAllocated()
  const remaining = WALLET_BALANCE - totalAllocated
  const progressPercentage = (totalAllocated / WALLET_BALANCE) * 100

  if (hasVoted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle>Portfolio Submitted!</CardTitle>
          <CardDescription>
            Thank you for voting. Your investments have been recorded.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Portfolio Voting</CardTitle>
          <CardDescription>
            Distribute your {WALLET_BALANCE} idecoin among the teams you believe in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Allocated</span>
              <Badge variant={remaining < 0 ? 'destructive' : 'default'}>
                <Coins className="h-3 w-3 mr-1" />
                {totalAllocated} / {WALLET_BALANCE}
              </Badge>
            </div>
            <Progress
              value={progressPercentage}
              className={`h-3 ${remaining < 0 ? 'bg-red-200' : ''}`}
            />
            <p className="text-xs text-muted-foreground text-right">
              Remaining: {remaining} idecoin
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {teams
          .filter((team) => team.id !== profile.team_id) // Don't let users vote for their own team
          .map((team) => {
            const note = userNotes[team.id]
            const currentVote = votes[team.id] || 0

            return (
              <Card key={team.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>Table {team.table_number}</CardDescription>
                    </div>
                    {note?.temp_rating && (
                      <Badge variant="outline">
                        ⭐ {note.temp_rating}/10
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {note?.note_text && (
                    <div className="p-2 bg-muted rounded text-sm">
                      <p className="text-muted-foreground italic">
                        &quot;{note.note_text}&quot;
                      </p>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`invest-${team.id}`} className="text-xs">
                        Investment Amount
                      </Label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`invest-${team.id}`}
                          type="number"
                          min="0"
                          max={WALLET_BALANCE}
                          value={currentVote || ''}
                          onChange={(e) => handleAmountChange(team.id, e.target.value)}
                          className="pl-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={submitVotes}
            disabled={isSubmitting || totalAllocated === 0 || remaining < 0}
            className="w-full h-12 text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Submit Portfolio ({totalAllocated} idecoin)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
