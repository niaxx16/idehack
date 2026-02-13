'use client'

import { useEffect, useState } from 'react'
import { Event, Team, Profile, UserNote } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useVotingStore } from '@/stores/voting-store'
import { Coins, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
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
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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
    loadAll()
  }, [event.id, profile.id])

  const loadAll = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      // Refresh auth session first to prevent stale token errors
      await supabase.auth.getSession()

      console.log('[PortfolioVoting] loadAll starting, event.id:', event.id, 'profile.id:', profile.id)
      await Promise.all([loadTeamsAndNotes(), checkIfVoted()])
      console.log('[PortfolioVoting] loadAll done')
    } catch (err: any) {
      console.error('[PortfolioVoting] Failed to load voting data:', err)
      setLoadError(err.message || 'Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTeamsAndNotes = async () => {
    // Load all teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', event.id)
      .order('table_number')

    console.log('[PortfolioVoting] teams query:', { count: teamsData?.length, error: teamsError, eventId: event.id })

    if (teamsError) throw teamsError

    if (teamsData) {
      setTeams(teamsData)

      // Only load notes if there are teams
      if (teamsData.length > 0) {
        const { data: notesData, error: notesError } = await supabase
          .from('user_notes')
          .select('*')
          .eq('user_id', profile.id)
          .in('target_team_id', teamsData.map(t => t.id))

        if (notesError) throw notesError

        if (notesData) {
          const notesMap: Record<string, UserNote> = {}
          notesData.forEach((note: UserNote) => {
            notesMap[note.target_team_id] = note
          })
          setUserNotes(notesMap)
        }
      }
    }
  }

  const checkIfVoted = async () => {
    // Check if user has already made transactions for THIS event's teams
    const { data: eventTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('event_id', event.id)

    if (!eventTeams?.length) {
      setHasVoted(false)
      return
    }

    const { data, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .eq('sender_id', profile.id)
      .in('receiver_team_id', eventTeams.map(t => t.id))
      .limit(1)

    if (txError) throw txError

    const voted = !!data && data.length > 0
    console.log('[PortfolioVoting] checkIfVoted:', { voted, transactionCount: data?.length, eventTeamCount: eventTeams.length })
    setHasVoted(voted)
  }

  const handleAmountChange = (teamId: string, value: string) => {
    const amount = parseInt(value) || 0
    updateVote(teamId, amount)
  }

  const getTeamsWithInvestment = () => {
    return Object.entries(votes).filter(([, amount]) => amount > 0).length
  }

  const submitVotes = async () => {
    const totalAllocated = getTotalAllocated()
    const teamsInvested = getTeamsWithInvestment()

    if (totalAllocated > WALLET_BALANCE) {
      setError(`You can't allocate more than ${WALLET_BALANCE} idecoin`)
      return
    }

    if (totalAllocated === 0) {
      setError('Please allocate some investment')
      return
    }

    if (teamsInvested < 3) {
      setError('You must invest in exactly 3 teams')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Refresh session before submitting
      await supabase.auth.getSession()

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
  const teamsInvested = getTeamsWithInvestment()

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          </div>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle>Bağlantı Hatası</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={loadAll}>
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    )
  }

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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Teams: {teamsInvested}/3</span>
              <span>Remaining: {remaining} idecoin</span>
            </div>
            {teamsInvested < 3 && totalAllocated > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>You must invest in exactly 3 different teams</span>
              </div>
            )}
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
            disabled={isSubmitting || totalAllocated === 0 || remaining < 0 || teamsInvested !== 3}
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
