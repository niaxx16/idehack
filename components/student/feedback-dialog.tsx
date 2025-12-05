'use client'

import { useState } from 'react'
import { MentorFeedbackWithMentor } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FeedbackDialogProps {
  sectionKey: string
  sectionTitle: string
  sectionColor: string
  feedbacks: MentorFeedbackWithMentor[]
  onMarkAsRead: (feedbackId: string) => void
}

export function FeedbackDialog({
  sectionKey,
  sectionTitle,
  sectionColor,
  feedbacks,
  onMarkAsRead,
}: FeedbackDialogProps) {
  const t = useTranslations('student')
  const unreadCount = feedbacks.filter((f) => !f.is_read).length
  const [open, setOpen] = useState(false)

  if (feedbacks.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2 relative">
          <MessageSquare className="mr-2 h-4 w-4" />
          {t('canvas.mentorFeedback')}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 h-5 px-1.5 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('canvas.mentorFeedbackFor', { section: sectionTitle })}</DialogTitle>
          <DialogDescription>
            {t('canvas.feedbackDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className={`p-4 rounded-lg border ${
                feedback.is_read
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-purple-50 border-purple-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium">
                    {feedback.mentor?.full_name || 'Mentor'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(feedback.created_at).toLocaleString('tr-TR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!feedback.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMarkAsRead(feedback.id)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    {t('canvas.markAsRead')}
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{feedback.feedback_text}</p>
              {feedback.is_read && (
                <p className="text-xs text-green-600 mt-2">✓ {t('canvas.read')}</p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
