'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import { CanvasContributionWithUser, TeamDecision } from '@/types'
import { registerTurkishFont } from '@/lib/utils/pdf-font'
import { useTranslations } from 'next-intl'

interface CanvasPdfExportProps {
  teamName: string
  contributions: Record<string, CanvasContributionWithUser[]>
  teamDecisions: Record<string, TeamDecision | null>
}

const sectionConfig = [
  { key: 'problem', titleKey: 'problem', color: [239, 68, 68] },
  { key: 'solution', titleKey: 'solution', color: [234, 179, 8] },
  { key: 'value_proposition', titleKey: 'uniqueValue', color: [168, 85, 247] },
  { key: 'target_audience', titleKey: 'targetAudience', color: [59, 130, 246] },
  { key: 'evidence', titleKey: 'evidence', color: [34, 211, 238] },
  { key: 'key_features', titleKey: 'keyFeatures', color: [34, 197, 94] },
  { key: 'pilot_plan', titleKey: 'pilotPlan', color: [249, 115, 22] },
  { key: 'success_metrics', titleKey: 'successMetrics', color: [99, 102, 241] },
  { key: 'resources_risks', titleKey: 'resourcesRisks', color: [244, 63, 94] },
]

export function CanvasPdfExport({ teamName, contributions, teamDecisions }: CanvasPdfExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const t = useTranslations('student.canvas')
  const tPdf = useTranslations('student.pdf')

  const exportToPdf = async () => {
    setIsExporting(true)

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')

      // Register Turkish-compatible font
      await registerTurkishFont(pdf)

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - 2 * margin
      let yPosition = margin

      // Title
      pdf.setFontSize(24)
      pdf.setTextColor(88, 28, 135)
      pdf.text(teamName, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      // Subtitle
      pdf.setFontSize(12)
      pdf.setTextColor(107, 114, 128)
      pdf.text(tPdf('subtitle'), pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 5

      // Date
      pdf.setFontSize(10)
      pdf.text(new Date().toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      // Sections
      for (const section of sectionConfig) {
        const sectionContributions = contributions[section.key] || []
        const teamDecision = teamDecisions[section.key]
        const sectionTitle = t(section.titleKey)

        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = margin
        }

        // Section header
        pdf.setFillColor(section.color[0], section.color[1], section.color[2])
        pdf.roundedRect(margin, yPosition, contentWidth, 8, 2, 2, 'F')
        pdf.setFontSize(12)
        pdf.setTextColor(255, 255, 255)
        pdf.text(sectionTitle, margin + 4, yPosition + 5.5)
        yPosition += 12

        // Team Decision
        if (teamDecision) {
          pdf.setFillColor(220, 252, 231)
          pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F')
          pdf.setFontSize(9)
          pdf.setTextColor(22, 101, 52)
          pdf.text(tPdf('teamDecision') + ':', margin + 2, yPosition + 4)
          yPosition += 7

          pdf.setFontSize(10)
          pdf.setTextColor(21, 128, 61)
          const decisionLines = pdf.splitTextToSize(teamDecision.content, contentWidth - 4)

          const decisionHeight = decisionLines.length * 5 + 4
          if (yPosition + decisionHeight > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }

          pdf.setFillColor(240, 253, 244)
          pdf.roundedRect(margin, yPosition, contentWidth, decisionHeight, 1, 1, 'F')
          pdf.setDrawColor(134, 239, 172)
          pdf.roundedRect(margin, yPosition, contentWidth, decisionHeight, 1, 1, 'S')

          decisionLines.forEach((line: string, index: number) => {
            pdf.text(line, margin + 2, yPosition + 4 + (index * 5))
          })
          yPosition += decisionHeight + 4
        }

        // Contributions
        if (sectionContributions.length > 0) {
          pdf.setFontSize(9)
          pdf.setTextColor(107, 114, 128)
          pdf.text(tPdf('teamContributions') + ':', margin + 2, yPosition + 3)
          yPosition += 6

          for (const contrib of sectionContributions) {
            const contentLines = pdf.splitTextToSize(contrib.content, contentWidth - 8)
            const contributionHeight = contentLines.length * 4 + 8

            if (yPosition + contributionHeight > pageHeight - margin) {
              pdf.addPage()
              yPosition = margin
            }

            pdf.setFillColor(249, 250, 251)
            pdf.roundedRect(margin + 2, yPosition, contentWidth - 4, contributionHeight, 1, 1, 'F')

            pdf.setFontSize(8)
            pdf.setTextColor(75, 85, 99)
            const authorText = contrib.is_captain ? `${contrib.member_name} (${tPdf('captain')})` : contrib.member_name
            pdf.text(authorText, margin + 4, yPosition + 4)

            pdf.setFontSize(9)
            pdf.setTextColor(31, 41, 55)
            contentLines.forEach((line: string, index: number) => {
              pdf.text(line, margin + 4, yPosition + 8 + (index * 4))
            })

            yPosition += contributionHeight + 2
          }
        } else if (!teamDecision) {
          pdf.setFontSize(10)
          pdf.setTextColor(156, 163, 175)
          pdf.text(tPdf('noContributions'), margin + 4, yPosition + 4)
          yPosition += 8
        }

        yPosition += 8
      }

      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(156, 163, 175)
      pdf.text(
        tPdf('generatedBy'),
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      pdf.save(`${teamName.replace(/\s+/g, '_')}_Canvas.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={exportToPdf}
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {tPdf('exporting')}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {tPdf('download')}
        </>
      )}
    </Button>
  )
}
