'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Users, Trophy, BarChart3, Presentation } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { profile, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && profile) {
      // Redirect based on role
      if (profile.role === 'admin') {
        router.push('/admin')
      } else if (profile.role === 'jury') {
        router.push('/jury')
      } else if (profile.role === 'mentor') {
        router.push('/mentor')
      } else if (profile.team_id) {
        router.push('/student')
      }
    }
  }, [profile, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            InovaSprint
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform for managing high school ideathons/hackathons with hybrid support
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-10 w-10 mb-2 text-blue-600" />
              <CardTitle>Admin Dashboard</CardTitle>
              <CardDescription>Control event phases and manage teams</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Presentation className="h-10 w-10 mb-2 text-green-600" />
              <CardTitle>Team View</CardTitle>
              <CardDescription>Project canvas and file uploads</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-10 w-10 mb-2 text-purple-600" />
              <CardTitle>Student View</CardTitle>
              <CardDescription>Watch pitches, take notes, vote</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Trophy className="h-10 w-10 mb-2 text-yellow-600" />
              <CardTitle>Jury Dashboard</CardTitle>
              <CardDescription>Remote scoring and evaluation</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>Choose your role to begin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
              size="lg"
            >
              Admin / Jury / Mentor Login
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              onClick={() => router.push('/join')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Join as Student
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Students: Scan your team&apos;s QR code to join directly
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Built with Next.js, Supabase, and TypeScript</p>
        </div>
      </div>
    </div>
  )
}
