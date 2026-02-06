'use client'

import { useEffect, useState } from 'react'
import { Event, Team } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Coins, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface InvestmentsOverviewProps {
  event: Event | null
  teams: Team[]
}

interface TransactionRow {
  id: string
  sender_id: string
  receiver_team_id: string
  amount: number
  created_at: string
}

interface InvestorInfo {
  id: string
  name: string
  teamId: string
  teamName: string
}

interface InvestmentEntry {
  investor: InvestorInfo
  investments: { teamId: string; teamName: string; amount: number }[]
  totalSpent: number
}

export function InvestmentsOverview({ event, teams }: InvestmentsOverviewProps) {
  const t = useTranslations('admin.investmentsOverview')
  const [entries, setEntries] = useState<InvestmentEntry[]>([])
  const [teamTotals, setTeamTotals] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (event?.id && teams.length > 0) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [event?.id, teams])

  // Real-time subscription
  useEffect(() => {
    if (!event?.id) return

    const channel = supabase
      .channel('investments-overview')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event?.id, supabase])

  const loadData = async () => {
    if (!event?.id || teams.length === 0) return

    try {
      const teamIds = teams.map(t => t.id)

      // Load all transactions for teams in this event
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, sender_id, receiver_team_id, amount, created_at')
        .in('receiver_team_id', teamIds)
        .order('created_at', { ascending: false })

      if (!transactions || transactions.length === 0) {
        setEntries([])
        setTeamTotals(new Map())
        setIsLoading(false)
        return
      }

      // Get unique sender IDs
      const senderIds = [...new Set(transactions.map(tx => tx.sender_id))]

      // Load sender profiles with their team membership
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds)

      // Build team name map
      const teamMap = new Map<string, string>()
      teams.forEach(t => teamMap.set(t.id, t.name))

      // Find which team each sender belongs to
      const senderTeamMap = new Map<string, { teamId: string; teamName: string }>()
      teams.forEach(team => {
        const members = (team.team_members as any[]) || []
        members.forEach(m => {
          senderTeamMap.set(m.user_id, { teamId: team.id, teamName: team.name })
        })
      })

      // Build profile map
      const profileMap = new Map<string, string>()
      profiles?.forEach(p => profileMap.set(p.id, p.full_name || ''))

      // Group transactions by sender
      const senderMap = new Map<string, TransactionRow[]>()
      transactions.forEach(tx => {
        const existing = senderMap.get(tx.sender_id) || []
        existing.push(tx)
        senderMap.set(tx.sender_id, existing)
      })

      // Build entries
      const investmentEntries: InvestmentEntry[] = []
      senderMap.forEach((txs, senderId) => {
        const senderTeam = senderTeamMap.get(senderId)
        const investor: InvestorInfo = {
          id: senderId,
          name: profileMap.get(senderId) || t('unknownStudent'),
          teamId: senderTeam?.teamId || '',
          teamName: senderTeam?.teamName || '-',
        }

        const investments = txs.map(tx => ({
          teamId: tx.receiver_team_id,
          teamName: teamMap.get(tx.receiver_team_id) || '-',
          amount: tx.amount,
        }))

        const totalSpent = investments.reduce((sum, inv) => sum + inv.amount, 0)

        investmentEntries.push({ investor, investments, totalSpent })
      })

      // Sort by total spent descending
      investmentEntries.sort((a, b) => b.totalSpent - a.totalSpent)

      // Calculate team totals
      const totals = new Map<string, number>()
      transactions.forEach(tx => {
        totals.set(tx.receiver_team_id, (totals.get(tx.receiver_team_id) || 0) + tx.amount)
      })

      setEntries(investmentEntries)
      setTeamTotals(totals)
    } catch (error) {
      console.error('Failed to load investments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportToExcel = () => {
    if (!event || entries.length === 0) return

    const escapeHtml = (value: string) => {
      return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    }

    // Collect all receiving teams
    const allReceiverTeams = new Map<string, string>()
    entries.forEach(entry => {
      entry.investments.forEach(inv => {
        allReceiverTeams.set(inv.teamId, inv.teamName)
      })
    })
    const receiverTeams = Array.from(allReceiverTeams.entries())

    // Headers
    const headers = [
      t('studentName'),
      t('studentTeam'),
      ...receiverTeams.map(([, name]) => name),
      t('totalSpent'),
    ]

    // Rows
    const rows = entries.map(entry => {
      const cells = [
        entry.investor.name,
        entry.investor.teamName,
        ...receiverTeams.map(([teamId]) => {
          const inv = entry.investments.find(i => i.teamId === teamId)
          return inv ? inv.amount.toString() : ''
        }),
        entry.totalSpent.toString(),
      ]
      return cells
    })

    // Team totals row
    const totalRow = [
      '',
      t('totalReceived'),
      ...receiverTeams.map(([teamId]) => (teamTotals.get(teamId) || 0).toString()),
      '',
    ]

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${escapeHtml(t('title'))}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          td, th { border: 1px solid #ccc; padding: 5px; }
          th { background-color: #f0f0f0; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
            <tr style="font-weight:bold;background:#e8f5e9;">${totalRow.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${event.name}_yatirimlar_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!event) return null

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">{t('noInvestments')}</p>
        </CardContent>
      </Card>
    )
  }

  // Get sorted teams by total investment
  const sortedTeamTotals = Array.from(teamTotals.entries())
    .map(([teamId, total]) => ({
      teamId,
      teamName: teams.find(t => t.id === teamId)?.name || '-',
      total,
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            {t('exportExcel')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team totals summary */}
        <div>
          <h3 className="text-sm font-semibold mb-3">{t('teamTotals')}</h3>
          <div className="flex flex-wrap gap-2">
            {sortedTeamTotals.map((item, index) => (
              <Badge
                key={item.teamId}
                variant="outline"
                className={`text-sm py-1.5 px-3 ${
                  index === 0 ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                  index === 1 ? 'bg-slate-50 border-slate-300 text-slate-700' :
                  index === 2 ? 'bg-orange-50 border-orange-300 text-orange-800' :
                  'bg-white'
                }`}
              >
                {item.teamName}: <span className="font-mono font-bold ml-1">{item.total}</span> idecoin
              </Badge>
            ))}
          </div>
        </div>

        {/* Detailed investments table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">{t('studentName')}</TableHead>
                <TableHead className="min-w-[120px]">{t('studentTeam')}</TableHead>
                <TableHead className="min-w-[250px]">{t('investedTeams')}</TableHead>
                <TableHead className="text-center min-w-[100px]">{t('totalSpent')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => (
                <TableRow key={entry.investor.id}>
                  <TableCell className="font-medium">{entry.investor.name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{entry.investor.teamName}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.investments.map((inv, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {inv.teamName}: <span className="font-bold ml-1">{inv.amount}</span>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono font-bold">
                      {entry.totalSpent}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
