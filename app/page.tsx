'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Users, Vote, Lightbulb } from 'lucide-react'
import Image from 'next/image'

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
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      <div className="flex-1 flex flex-col justify-center py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              InovaSprint
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive platform for managing high school ideathons and hackathons
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8 items-start mb-8">
            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="hover:shadow-lg transition-all hover:scale-105">
                <CardHeader className="pb-3">
                  <Sparkles className="h-8 w-8 mb-2 text-blue-600" />
                  <CardTitle className="text-base">Multi-Event</CardTitle>
                  <CardDescription className="text-xs">Manage multiple events seamlessly</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-all hover:scale-105">
                <CardHeader className="pb-3">
                  <Lightbulb className="h-8 w-8 mb-2 text-yellow-600" />
                  <CardTitle className="text-base">Lean Canvas</CardTitle>
                  <CardDescription className="text-xs">Real-time idea development</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-all hover:scale-105">
                <CardHeader className="pb-3">
                  <Users className="h-8 w-8 mb-2 text-purple-600" />
                  <CardTitle className="text-base">Mentor System</CardTitle>
                  <CardDescription className="text-xs">Instant feedback and support</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-all hover:scale-105">
                <CardHeader className="pb-3">
                  <Vote className="h-8 w-8 mb-2 text-green-600" />
                  <CardTitle className="text-base">Portfolio Voting</CardTitle>
                  <CardDescription className="text-xs">Investment simulation voting</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Login Card */}
            <Card className="shadow-xl border-2">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Get Started</CardTitle>
                <CardDescription>Sign in according to your role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  Admin / Jury / Mentor Login
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  onClick={() => router.push('/join')}
                  variant="outline"
                  className="w-full border-2"
                  size="lg"
                >
                  Join as Student
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-2">
                  Students: Scan your team&apos;s QR code to join directly
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm py-4 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {/* MEM Logo */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src="/images/mem-logo.png"
                  alt="Bursa MEM Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-700">Developed by Bursa Provincial Directorate of National Education</p>
                <p className="text-xs">Research and Development Unit</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
