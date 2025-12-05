'use client'

import { useState, useRef } from 'react'
import { Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, FileText, CheckCircle, ExternalLink, Lightbulb, Users, Target, Leaf, Rocket, TrendingUp, HelpCircle, Award } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('student')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(t('upload.invalidType'))
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError(t('upload.tooLarge'))
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
              <CardTitle>{t('pitchGuide.title')}</CardTitle>
              <CardDescription>
                {t('pitchGuide.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Core Questions */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('pitchGuide.coreQuestions')}</h4>

              <div className="grid gap-3">
                <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">{t('pitchGuide.whoAreWe')}</p>
                    <p className="text-sm text-blue-700">{t('pitchGuide.whoAreWeDesc')}</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">{t('pitchGuide.whatProblem')}</p>
                    <p className="text-sm text-red-700">{t('pitchGuide.whatProblemDesc')}</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">{t('pitchGuide.whatSolution')}</p>
                    <p className="text-sm text-yellow-700">{t('pitchGuide.whatSolutionDesc')}</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Leaf className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">{t('pitchGuide.whySustainable')}</p>
                    <p className="text-sm text-green-700">{t('pitchGuide.whySustainableDesc')}</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Rocket className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">{t('pitchGuide.firstStep')}</p>
                    <p className="text-sm text-purple-700">{t('pitchGuide.firstStepDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Questions */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('pitchGuide.strengthenPitch')}</h4>

              <div className="grid gap-3">
                <div className="flex gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <Target className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-indigo-900">{t('pitchGuide.targetAudience')}</p>
                    <p className="text-sm text-indigo-700">{t('pitchGuide.targetAudienceDesc')}</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <Award className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">{t('pitchGuide.whatMakesDifferent')}</p>
                    <p className="text-sm text-orange-700">{t('pitchGuide.whatMakesDifferentDesc')}</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-teal-900">{t('pitchGuide.measureSuccess')}</p>
                    <p className="text-sm text-teal-700">{t('pitchGuide.measureSuccessDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">💡 {t('pitchGuide.tips')}</h4>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li>• {t('pitchGuide.tip1')}</li>
                <li>• {t('pitchGuide.tip2')}</li>
                <li>• {t('pitchGuide.tip3')}</li>
                <li>• {t('pitchGuide.tip4')}</li>
                <li>• {t('pitchGuide.tip5')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('upload.title')}</CardTitle>
          <CardDescription>
            {t('upload.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {team.presentation_url ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-900">{t('upload.uploaded')}</p>
                <p className="text-sm text-green-700">{t('upload.readyForPitch')}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={openPresentation} variant="outline" className="flex-1">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('upload.viewPresentation')}
              </Button>

              {!isLocked && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                  className="flex-1"
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('upload.replaceFile')}
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
                {isLocked ? t('upload.noPresentation') : t('upload.uploadPresentation')}
              </p>
              <p className="text-sm text-muted-foreground">
                {isLocked
                  ? t('upload.submissionsLocked')
                  : t('upload.clickToBrowse')}
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
                    {t('upload.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('upload.chooseFile')}
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
              {t('upload.uploading')} {uploadProgress}%
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
          <p>{t('upload.acceptedFormats')}</p>
          <p>{t('upload.maxSize')}</p>
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
