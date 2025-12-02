'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Key, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RejoinPage() {
  const router = useRouter()
  const supabase = createClient()

  const [personalCode, setPersonalCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRejoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personalCode.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Sign in anonymously (this creates a new session)
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
      if (authError) throw authError

      // Call the rejoin function to transfer profile data
      const { data: rejoinData, error: rejoinError } = await supabase.rpc('rejoin_with_personal_code', {
        personal_code_input: personalCode.toUpperCase(),
      })

      if (rejoinError) throw rejoinError

      if (!rejoinData || !rejoinData.success) {
        throw new Error('Failed to rejoin. Please try again.')
      }

      // Redirect to student dashboard
      router.push('/student')
    } catch (err: any) {
      console.error('Rejoin error:', err)
      setError(err.message || 'Failed to rejoin. Please check your code and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
            <Key className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome Back!
          </CardTitle>
          <CardDescription>
            Enter your personal code to rejoin your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRejoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Personal Code</Label>
              <Input
                id="code"
                placeholder="e.g., A1B2C3"
                value={personalCode}
                onChange={(e) => setPersonalCode(e.target.value.toUpperCase())}
                className="text-center text-2xl font-mono tracking-wider"
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-character code you received when you first joined
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !personalCode}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejoining...
                </>
              ) : (
                'Rejoin Team'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                Don't have a personal code?
              </p>
              <Link href="/join">
                <Button variant="outline" className="w-full" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Join a New Team
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
