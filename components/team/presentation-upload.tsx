'use client'

import { useState, useRef } from 'react'
import { Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, FileText, CheckCircle, ExternalLink } from 'lucide-react'
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

      // Get the Supabase project URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) throw new Error('Supabase URL not configured')

      // Construct the full public URL manually
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/team-presentations/${fileName}`

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
  )
}
