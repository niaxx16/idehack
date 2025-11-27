'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function JoinFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [activationCode, setActivationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if code is in URL (from QR scan)
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setActivationCode(codeFromUrl.toUpperCase())
    }
  }, [searchParams])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activationCode) return

    setIsLoading(true)
    setError(null)

    try {
      // First, sign in anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

      if (authError) throw authError

      // Store activation code in session for next step
      sessionStorage.setItem('pending_activation_code', activationCode.toUpperCase())
      sessionStorage.setItem('pending_user_id', authData.user.id)

      // Redirect to team setup page
      router.push('/join/setup')
    } catch (err: any) {
      console.error('Join error:', err)
      setError(err.message || 'Failed to join. Please check the code and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Join Your Team
          </CardTitle>
          <CardDescription>
            Enter your table's activation code or scan the QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Activation Code</Label>
              <Input
                id="code"
                placeholder="e.g., ABC12345"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                className="text-center text-2xl font-mono tracking-wider"
                maxLength={8}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Find this code on your table
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
              disabled={isLoading || !activationCode}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Don't have a code? Ask your event organizer or scan the QR code on your table.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    }>
      <JoinFormContent />
    </Suspense>
  )
}
