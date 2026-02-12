'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import { CanvasContributionWithUser, TeamDecision } from '@/types'

interface CanvasPdfExportProps {
  teamName: string
  contributions: Record<string, CanvasContributionWithUser[]>
  teamDecisions: Record<string, TeamDecision | null>
}

const sectionConfig = [
  { key: 'problem', title: 'Problem', color: [239, 68, 68] }, // red
  { key: 'solution', title: 'Solution', color: [234, 179, 8] }, // yellow
  { key: 'value_proposition', title: 'Unique Value Proposition', color: [168, 85, 247] }, // purple
  { key: 'target_audience', title: 'Target Users', color: [59, 130, 246] }, // blue
  { key: 'evidence', title: 'Evidence / Insight', color: [34, 211, 238] }, // cyan
  { key: 'key_features', title: 'Key Features', color: [34, 197, 94] }, // green
  { key: 'pilot_plan', title: 'Pilot Plan', color: [249, 115, 22] }, // orange
  { key: 'success_metrics', title: 'Success Metrics', color: [99, 102, 241] }, // indigo
  { key: 'resources_risks', title: 'Resources & Risks', color: [244, 63, 94] }, // rose
]

export function CanvasPdfExport({ teamName, contributions, teamDecisions }: CanvasPdfExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPdf = async () => {
    setIsExporting(true)

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - 2 * margin
      let yPosition = margin

      // Title
      pdf.setFontSize(24)
      pdf.setTextColor(88, 28, 135) // purple-900
      pdf.text(teamName, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      // Subtitle
      pdf.setFontSize(12)
      pdf.setTextColor(107, 114, 128) // gray-500
      pdf.text('Business Model Canvas', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 5

      // Date
      pdf.setFontSize(10)
      pdf.text(new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      // Sections
      for (const section of sectionConfig) {
        const sectionContributions = contributions[section.key] || []
        const teamDecision = teamDecisions[section.key]

        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = margin
        }

        // Section header with colored background
        pdf.setFillColor(section.color[0], section.color[1], section.color[2])
        pdf.roundedRect(margin, yPosition, contentWidth, 8, 2, 2, 'F')
        pdf.setFontSize(12)
        pdf.setTextColor(255, 255, 255)
        pdf.text(section.title, margin + 4, yPosition + 5.5)
        yPosition += 12

        // Team Decision (if exists)
        if (teamDecision) {
          pdf.setFillColor(220, 252, 231) // green-100
          pdf.roundedRect(margin, yPosition, contentWidth, 6, 1, 1, 'F')
          pdf.setFontSize(9)
          pdf.setTextColor(22, 101, 52) // green-800
          pdf.text('Team Decision:', margin + 2, yPosition + 4)
          yPosition += 7

          pdf.setFontSize(10)
          pdf.setTextColor(21, 128, 61) // green-700
          const decisionLines = pdf.splitTextToSize(teamDecision.content, contentWidth - 4)

          // Check if we need more space
          const decisionHeight = decisionLines.length * 5 + 4
          if (yPosition + decisionHeight > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }

          pdf.setFillColor(240, 253, 244) // green-50
          pdf.roundedRect(margin, yPosition, contentWidth, decisionHeight, 1, 1, 'F')
          pdf.setDrawColor(134, 239, 172) // green-300
          pdf.roundedRect(margin, yPosition, contentWidth, decisionHeight, 1, 1, 'S')

          decisionLines.forEach((line: string, index: number) => {
            pdf.text(line, margin + 2, yPosition + 4 + (index * 5))
          })
          yPosition += decisionHeight + 4
        }

        // Individual contributions
        if (sectionContributions.length > 0) {
          pdf.setFontSize(9)
          pdf.setTextColor(107, 114, 128)
          pdf.text('Team Contributions:', margin + 2, yPosition + 3)
          yPosition += 6

          for (const contrib of sectionContributions) {
            const contentLines = pdf.splitTextToSize(contrib.content, contentWidth - 8)
            const contributionHeight = contentLines.length * 4 + 8

            // Check if we need a new page
            if (yPosition + contributionHeight > pageHeight - margin) {
              pdf.addPage()
              yPosition = margin
            }

            // Contribution box
            pdf.setFillColor(249, 250, 251) // gray-50
            pdf.roundedRect(margin + 2, yPosition, contentWidth - 4, contributionHeight, 1, 1, 'F')

            // Author name
            pdf.setFontSize(8)
            pdf.setTextColor(75, 85, 99) // gray-600
            const authorText = contrib.is_captain ? `${contrib.member_name} (Captain)` : contrib.member_name
            pdf.text(authorText, margin + 4, yPosition + 4)

            // Content
            pdf.setFontSize(9)
            pdf.setTextColor(31, 41, 55) // gray-800
            contentLines.forEach((line: string, index: number) => {
              pdf.text(line, margin + 4, yPosition + 8 + (index * 4))
            })

            yPosition += contributionHeight + 2
          }
        } else if (!teamDecision) {
          pdf.setFontSize(9)
          pdf.setTextColor(156, 163, 175) // gray-400
          pdf.setFontSize(10)
          pdf.text('No contributions yet', margin + 4, yPosition + 4)
          yPosition += 8
        }

        yPosition += 8 // Space between sections
      }

      // Footer on last page
      pdf.setFontSize(8)
      pdf.setTextColor(156, 163, 175)
      pdf.text(
        'Generated by InovaSprint',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      // Save the PDF
      pdf.save(`${teamName.replace(/\s+/g, '_')}_Canvas.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to export PDF. Please try again.')
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
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  )
}
