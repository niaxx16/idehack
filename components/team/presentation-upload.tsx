'use client'

import { useState, useRef } from 'react'
import { Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, FileText, CheckCircle, ExternalLink, Lightbulb, Users, Target, Leaf, Rocket, TrendingUp, HelpCircle, Award } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface PresentationUploadProps {
  team: Team
  isLocked: boolean
  onUpdate: () => void
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function PresentationUpload({ team, isLocked, onUpdate }: PresentationUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Please upload PDF, PPT, or DOCX files.')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 50MB.')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${team.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('team-presentations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Always use the hardcoded Supabase URL to ensure correctness
      const supabaseUrl = 'https://udlkyxytmyxxktflzfpi.supabase.co'
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/team-presentations/${fileName}`

      console.log('Generated presentation URL:', publicUrl)

      // Update team record with presentation URL
      const { error: updateError } = await supabase
        .from('teams')
        .update({ presentation_url: publicUrl })
        .eq('id', team.id)

      if (updateError) throw updateError

      setUploadProgress(100)
      onUpdate()

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const openPresentation = () => {
    if (team.presentation_url) {
      window.open(team.presentation_url, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Pitch Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Pitch Guide</CardTitle>
              <CardDescription>
                Use these questions to structure your presentation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Core Questions */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Core Questions</h4>

              <div className="grid gap-3">
                <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Who are we?</p>
                    <p className="text-sm text-blue-700">Introduce your team and the scenario you're addressing</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">What problem are we solving and for whom?</p>
                    <p className="text-sm text-red-700">Define the problem clearly and identify who experiences it</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">What is our solution and how does it work?</p>
                    <p className="text-sm text-yellow-700">Explain your idea and demonstrate how it solves the problem</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Leaf className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Why is it sustainable?</p>
                    <p className="text-sm text-green-700">Address environmental, social, and economic sustainability</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Rocket className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">What's our first step?</p>
                    <p className="text-sm text-purple-700">Describe the immediate action plan to start implementing</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Questions */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Strengthen Your Pitch</h4>

              <div className="grid gap-3">
                <div className="flex gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <Target className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-indigo-900">Who is our target audience?</p>
                    <p className="text-sm text-indigo-700">Define the specific users or customers who will benefit</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <Award className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">What makes us different?</p>
                    <p className="text-sm text-orange-700">Highlight your unique value proposition and competitive advantage</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-teal-900">How will we measure success?</p>
                    <p className="text-sm text-teal-700">Define key metrics and indicators to track progress</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">💡 Presentation Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li>• Keep it simple: 5-10 slides maximum</li>
                <li>• Use visuals: diagrams, mockups, or prototypes</li>
                <li>• Tell a story: make it memorable and engaging</li>
                <li>• Practice your timing: respect the pitch duration</li>
                <li>• End with a clear call-to-action</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Presentation Upload</CardTitle>
          <CardDescription>
            Upload your pitch deck (PDF, PPT, or DOCX - Max 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {team.presentation_url ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Presentation uploaded!</p>
                <p className="text-sm text-green-700">Your file is ready for the pitch.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={openPresentation} variant="outline" className="flex-1">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Presentation
              </Button>

              {!isLocked && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                  className="flex-1"
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Replace File
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => !isLocked && !isUploading && fileInputRef.current?.click()}
            >
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {isLocked ? 'No presentation uploaded' : 'Upload your presentation'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isLocked
                  ? 'Submissions are locked'
                  : 'Click to browse or drag and drop your file'}
              </p>
            </div>

            {!isLocked && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-center text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLocked || isUploading}
        />

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Accepted formats: PDF, PowerPoint, Word</p>
          <p>Maximum file size: 50MB</p>
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
