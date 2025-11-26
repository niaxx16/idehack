'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, joinTeam, signInAnonymously } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamInfo, setTeamInfo] = useState<{ name: string } | null>(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      router.push('/login')
    }
  }, [token, router])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setIsJoining(true)
    setError(null)

    try {
      // Sign in anonymously if not already signed in
      if (!user) {
        await signInAnonymously(displayName || 'Anonymous User')
      }

      // Join the team
      const result = await joinTeam(token)

      if (result.success) {
        setTeamInfo({ name: result.team_name })
        // Redirect to student view after 2 seconds
        setTimeout(() => {
          router.push('/student')
        }, 2000)
      } else {
        setError(result.error || 'Failed to join team')
        setIsJoining(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join team')
      setIsJoining(false)
    }
  }

  if (!token) {
    return null
  }

  if (teamInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Success!</CardTitle>
            <CardDescription>
              You&apos;ve joined team <strong>{teamInfo.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Join Team</CardTitle>
          <CardDescription>Enter your name to join the hackathon team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={isJoining}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isJoining}>
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Team'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}
