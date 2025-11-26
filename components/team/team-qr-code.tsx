'use client'

import { Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import QRCode from 'qrcode.react'
import { Download } from 'lucide-react'

interface TeamQRCodeProps {
  team: Team
}

export function TeamQRCode({ team }: TeamQRCodeProps) {
  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/join?token=${team.access_token}`

  const downloadQR = () => {
    const canvas = document.getElementById('team-qr-code') as HTMLCanvasElement
    if (!canvas) return

    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${team.name}-QR.png`
    link.href = url
    link.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Join QR Code</CardTitle>
        <CardDescription>
          Share this QR code with your team members to let them join
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-6 bg-white rounded-lg shadow-lg">
            <QRCode
              id="team-qr-code"
              value={joinUrl}
              size={300}
              level="H"
              includeMargin
            />
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">{team.name}</p>
            <p className="text-sm text-muted-foreground">Table {team.table_number}</p>
          </div>

          <Button onClick={downloadQR} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Join URL:</p>
          <code className="text-xs break-all block p-2 bg-background rounded">
            {joinUrl}
          </code>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Display this QR code on your table</li>
            <li>Team members can scan with their phones</li>
            <li>They'll be prompted to enter their name</li>
            <li>They'll automatically join your team</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
