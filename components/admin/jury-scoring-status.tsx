'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Loader2, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { JuryScoringStatus } from '@/hooks/use-jury-scoring-status'

interface JuryScoringStatusCardProps {
  status: JuryScoringStatus
}

export function JuryScoringStatusCard({ status }: JuryScoringStatusCardProps) {
  const t = useTranslations('admin.pitchControl.juryStatus')

  if (status.isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('title')}
          </span>
          {status.total > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {t('counter', { done: status.scoredCount, total: status.total })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {status.total === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noJuries')}</p>
        ) : (
          <>
            {status.allScored && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{t('allDone')}</span>
              </div>
            )}
            {status.juries.map((jury) => (
              <div
                key={jury.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-white"
              >
                <span className="text-sm font-medium truncate">{jury.name}</span>
                {jury.scored ? (
                  <Badge
                    variant="outline"
                    className="gap-1 bg-green-50 text-green-700 border-green-300"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {t('scored')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t('pending')}
                  </Badge>
                )}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
