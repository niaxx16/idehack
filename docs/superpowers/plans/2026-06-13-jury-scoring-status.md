# Canlı Jüri Puanlama Durumu — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin pitch ekranında aktif sunumdaki takım için her jürinin puanlamayı tamamlayıp tamamlamadığı canlı görünsün; hepsi tamamlanınca bildirim çıksın ve "Sonraki takımı çağır" butonu vurgulansın.

**Architecture:** Tamamen istemci tarafı. Yeni bir hook (`use-jury-scoring-status`) jüri listesini ve aktif takımı puanlayan jüri kimliklerini çeker, `jury_scores` tablosuna `team_id` filtreli realtime abone olur. Sunum bileşeni (`jury-scoring-status`) durumu gösterir. `pitch-control` hook'u çağırır, kartı yerleştirir, "Sunumu durdur" butonunu "Sonraki takımı çağır" olarak günceller ve takım seçicide puanı olan takımları "(sundu)" işaretler. Migration yok.

**Tech Stack:** Next.js 14 (App Router, client components), Supabase (PostgREST + Realtime, mevcut RLS), next-intl, Shadcn/UI + lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-13-jury-scoring-status-design.md`

**Doğrulama düzeni (bu repo):** Test altyapısı yok. Her görev `npx next lint --file <dosya>` (değişen dosyada yeni hata olmaması) + `npm run build` ile doğrulanır. Commit mesajları geçici dosya ile yazılır (PowerShell tırnak sorunlarından kaçınmak için).

---

### Task 1: i18n anahtarları

**Files:**
- Modify: `messages/tr.json` (`admin.pitchControl` nesnesi, ~219-254)
- Modify: `messages/en.json` (`admin.pitchControl` nesnesi, ~219-254)

- [ ] **Step 1: `messages/tr.json` → `admin.pitchControl` içine ekle**

`"stopPitch": "Sunumu Durdur",` satırından hemen SONRA şu anahtarları ekle (mevcut `stopPitch` korunur):

```json
      "callNextTeam": "Sonraki Takımı Çağır",
      "alreadyPitched": "sundu",
      "juryStatus": {
        "title": "Jüri Puanlama Durumu",
        "counter": "{done}/{total} jüri tamamladı",
        "scored": "Puanladı",
        "pending": "Bekleniyor",
        "allDone": "Tüm jüriler puanladı",
        "noJuries": "Bu etkinliğe atanmış jüri yok"
      },
```

- [ ] **Step 2: `messages/en.json` → `admin.pitchControl` içine ekle**

`"stopPitch": "Stop Pitch",` satırından hemen SONRA:

```json
      "callNextTeam": "Call Next Team",
      "alreadyPitched": "pitched",
      "juryStatus": {
        "title": "Jury Scoring Status",
        "counter": "{done}/{total} juries done",
        "scored": "Scored",
        "pending": "Pending",
        "allDone": "All juries have scored",
        "noJuries": "No juries assigned to this event"
      },
```

- [ ] **Step 3: JSON geçerliliğini doğrula**

Run: `node -e "require('./messages/tr.json'); require('./messages/en.json'); console.log('JSON OK')"`
Expected: `JSON OK`

- [ ] **Step 4: Commit**

```powershell
git add messages/tr.json messages/en.json
[System.IO.File]::WriteAllText("$env:TEMP\msg.txt", "Add jury scoring status i18n keys`n`nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>")
git commit -F "$env:TEMP\msg.txt"
Remove-Item "$env:TEMP\msg.txt"
```

---

### Task 2: Hook — `use-jury-scoring-status`

**Files:**
- Create: `hooks/use-jury-scoring-status.ts`

Bağlam: `createClient` (`@/lib/supabase/client`) tarayıcı istemcisini döner. Jüri yükleme deseni `components/admin/jury-management.tsx`'ten (`.eq('role','jury').or('event_id.is.null,event_id.eq.<id>')`). Realtime deseni `components/jury/my-scores-list.tsx`'ten (`.channel(...).on('postgres_changes', {table:'jury_scores', filter}, cb).subscribe()` + cleanup'ta `removeChannel`).

- [ ] **Step 1: Hook dosyasını yaz**

Dosyanın tamamı:

```ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface JuryScoringStatusEntry {
  id: string
  name: string
  scored: boolean
}

export interface JuryScoringStatus {
  juries: JuryScoringStatusEntry[]
  scoredCount: number
  total: number
  allScored: boolean
  isLoading: boolean
}

const EMPTY_STATUS: JuryScoringStatus = {
  juries: [],
  scoredCount: 0,
  total: 0,
  allScored: false,
  isLoading: false,
}

export function useJuryScoringStatus(
  eventId: string | null,
  teamId: string | null
): JuryScoringStatus {
  const [juries, setJuries] = useState<{ id: string; name: string }[]>([])
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Load jury list for the event
  useEffect(() => {
    if (!eventId || !teamId) {
      setJuries([])
      return
    }

    let active = true
    const loadJuries = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .eq('role', 'jury')
        .or(`event_id.is.null,event_id.eq.${eventId}`)

      if (!active) return
      if (error) {
        console.error('Failed to load juries:', error)
        setJuries([])
        return
      }

      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        name: p.display_name || p.full_name || 'Jüri',
      }))
      mapped.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      setJuries(mapped)
    }

    loadJuries()
    return () => {
      active = false
    }
  }, [eventId, teamId, supabase])

  // Load who has scored the current team, with realtime updates
  useEffect(() => {
    if (!teamId) {
      setScoredIds(new Set())
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)

    const loadScored = async () => {
      const { data, error } = await supabase
        .from('jury_scores')
        .select('jury_id')
        .eq('team_id', teamId)

      if (!active) return
      if (error) {
        console.error('Failed to load jury scores:', error)
      } else {
        setScoredIds(new Set((data || []).map((row: any) => row.jury_id)))
      }
      setIsLoading(false)
    }

    loadScored()

    const channel = supabase
      .channel(`admin-jury-status-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jury_scores',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          loadScored()
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [teamId, supabase])

  if (!eventId || !teamId) {
    return EMPTY_STATUS
  }

  const entries: JuryScoringStatusEntry[] = juries.map((j) => ({
    id: j.id,
    name: j.name,
    scored: scoredIds.has(j.id),
  }))
  const scoredCount = entries.filter((e) => e.scored).length
  const total = entries.length

  return {
    juries: entries,
    scoredCount,
    total,
    allScored: total > 0 && scoredCount === total,
    isLoading,
  }
}
```

- [ ] **Step 2: Build ile derlenebilirliği doğrula**

Run: `npm run build`
Expected: `✓ Compiled successfully`, tip hatası yok. (Hook henüz kullanılmıyor; sadece derleniyor.)

- [ ] **Step 3: Lint**

Run: `npx next lint --file hooks/use-jury-scoring-status.ts`
Expected: Bu dosya için yeni hata yok.

- [ ] **Step 4: Commit**

```powershell
git add hooks/use-jury-scoring-status.ts
[System.IO.File]::WriteAllText("$env:TEMP\msg.txt", "Add useJuryScoringStatus hook`n`nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>")
git commit -F "$env:TEMP\msg.txt"
Remove-Item "$env:TEMP\msg.txt"
```

---

### Task 3: Sunum bileşeni — `jury-scoring-status.tsx`

**Files:**
- Create: `components/admin/jury-scoring-status.tsx`

Bağlam: Shadcn `Card`/`CardContent`/`CardHeader`/`CardTitle` (`@/components/ui/card`), `Badge` (`@/components/ui/badge`). Icon'lar `lucide-react`. `useTranslations` `next-intl`'den. ICU değişkenli çeviri: `t('juryStatus.counter', { done, total })`.

- [ ] **Step 1: Bileşeni yaz**

Dosyanın tamamı:

```tsx
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
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`. (Bileşen henüz kullanılmıyor; derleniyor.)

- [ ] **Step 3: Lint**

Run: `npx next lint --file components/admin/jury-scoring-status.tsx`
Expected: Bu dosya için yeni hata yok.

- [ ] **Step 4: Commit**

```powershell
git add components/admin/jury-scoring-status.tsx
[System.IO.File]::WriteAllText("$env:TEMP\msg.txt", "Add JuryScoringStatusCard component`n`nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>")
git commit -F "$env:TEMP\msg.txt"
Remove-Item "$env:TEMP\msg.txt"
```

---

### Task 4: `pitch-control` entegrasyonu

**Files:**
- Modify: `components/admin/pitch-control.tsx`

Bağlam (mevcut yapı): import bloğu ~3-15; `currentTeam` ~58; `startPitch`/`stopPitch` ~269-318; aktif sunum JSX'i (süre çubuğu + butonlar) ~527-567; takım seçici `SelectItem` ~500-505. `stopPitch` zaten `current_team_id`'yi null'a çekiyor (seçici geri gelir). Hook React kuralları gereği koşulsuz, en üst seviyede çağrılmalı.

- [ ] **Step 1: Import'ları ekle**

`import { Label } from '@/components/ui/label'` satırından (en alttaki import) hemen sonra ekle:

```tsx
import { useJuryScoringStatus } from '@/hooks/use-jury-scoring-status'
import { JuryScoringStatusCard } from '@/components/admin/jury-scoring-status'
```

- [ ] **Step 2: Hook'u ve "puanlanmış takımlar" durumunu çağır**

`const currentTeam = teams.find((t) => t.id === event?.current_team_id)` satırından hemen sonra ekle:

```tsx
  const juryStatus = useJuryScoringStatus(event?.id ?? null, currentTeam?.id ?? null)
  const [pitchedTeamIds, setPitchedTeamIds] = useState<Set<string>>(new Set())
```

(`useState` zaten dosyanın başında import edili.)

- [ ] **Step 3: Puanlanmış takım kümesini yükleyen effect ekle**

Step 2'deki satırların hemen ardından, ilk `useEffect`'ten önce ekle:

```tsx
  // Teams that already have at least one jury score = "pitched"
  useEffect(() => {
    if (!event?.id || teams.length === 0) {
      setPitchedTeamIds(new Set())
      return
    }

    let active = true
    const loadPitched = async () => {
      const { data, error } = await supabase
        .from('jury_scores')
        .select('team_id')
        .in('team_id', teams.map((t) => t.id))

      if (!active) return
      if (error) {
        console.error('Failed to load pitched teams:', error)
        return
      }
      setPitchedTeamIds(new Set((data || []).map((row: any) => row.team_id)))
    }

    loadPitched()
    return () => {
      active = false
    }
  }, [event?.id, teams, supabase])
```

- [ ] **Step 4: Seçicide "(sundu)" işaretle**

Mevcut `SelectItem` bloğunu:

```tsx
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({t('table')} {team.table_number})
                      </SelectItem>
                    ))}
```

şununla değiştir:

```tsx
                    {teams.map((team) => {
                      const pitched = pitchedTeamIds.has(team.id)
                      return (
                        <SelectItem key={team.id} value={team.id}>
                          <span className={pitched ? 'text-muted-foreground' : ''}>
                            {team.name} ({t('table')} {team.table_number})
                            {pitched ? ` · ${t('alreadyPitched')}` : ''}
                          </span>
                        </SelectItem>
                      )
                    })}
```

- [ ] **Step 5: Durum kartını yerleştir + butonu güncelle**

Aktif sunum bloğundaki süre çubuğu `</div>` ile buton ızgarasının arasına durum kartını ekle ve buton ızgarasını güncelle. Şu mevcut parçayı:

```tsx
                <Progress value={progressPercentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currentTeam.presentation_url && (
                  <Button onClick={downloadPresentation} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t('downloadPresentation')}
                  </Button>
                )}
                <Button
                  onClick={stopPitch}
                  variant="destructive"
                  disabled={isStarting}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  {t('stopPitch')}
                </Button>
              </div>
```

şununla değiştir:

```tsx
                <Progress value={progressPercentage} className="h-3" />
              </div>

              <JuryScoringStatusCard status={juryStatus} />

              <div className="grid grid-cols-2 gap-3">
                {currentTeam.presentation_url && (
                  <Button onClick={downloadPresentation} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t('downloadPresentation')}
                  </Button>
                )}
                <Button
                  onClick={stopPitch}
                  variant={juryStatus.allScored ? 'default' : 'destructive'}
                  disabled={isStarting}
                  className={
                    !currentTeam.presentation_url ? 'col-span-2' : undefined
                  }
                >
                  {juryStatus.allScored ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  {t('callNextTeam')}
                </Button>
              </div>
```

(`CheckCircle` ve `Pause` zaten import edili — sırasıyla satır 10. `Download` da mevcut.)

- [ ] **Step 6: Lint + build**

Run: `npx next lint --file components/admin/pitch-control.tsx`
Expected: Bu dosya için yeni hata yok (mevcut eski uyarılar bilinen durum).
Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 7: Commit**

```powershell
git add components/admin/pitch-control.tsx
[System.IO.File]::WriteAllText("$env:TEMP\msg.txt", "Wire jury scoring status into pitch control`n`nShow live per-jury scoring status during a pitch, mark pitched teams in`nthe selector, and turn Stop Pitch into a Call Next Team button that`nhighlights once all juries have scored.`n`nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>")
git commit -F "$env:TEMP\msg.txt"
Remove-Item "$env:TEMP\msg.txt"
```

---

### Task 5: Canlı doğrulama (manuel)

**Files:** (kod değişikliği yok)

- [ ] **Step 1: Senaryo testi**

PITCHING durumundaki bir etkinlikte (jürileri olan):
1. Admin "Sunum Kontrolü" sekmesini açar, bir takımı sahneye çağırır.
2. "Jüri Puanlama Durumu" kartı tüm jürileri "Bekleniyor" ile listeler, sayaç `0/N`.
3. Bir jüri hesabıyla o takım puanlanıp kaydedilir → admin ekranında ilgili satır anında "Puanladı"ya döner, sayaç artar (realtime).
4. Tüm jüriler tamamlayınca yeşil "Tüm jüriler puanladı" şeridi çıkar ve buton "Sonraki Takımı Çağır" olarak vurgulu (default variant) görünür.
5. Butona basılır → sunum biter, seçici geri gelir; az önce sunan takım listede "· sundu" etiketiyle görünür.

- [ ] **Step 2: Push (kullanıcı onayıyla)**

```powershell
git push origin main
```

---

## Self-review notları

- Spec gereksinim → görev eşlemesi: hook (Task 2), sunum bileşeni (Task 3), pitch-control entegrasyonu + "Sonraki takımı çağır" + seçicide "sundu" (Task 4), i18n (Task 1), canlı doğrulama (Task 5). Boşluk yok.
- Tip/isim tutarlılığı: hook `JuryScoringStatus` ve `JuryScoringStatusEntry` export eder; bileşen `JuryScoringStatusCard` adıyla export edilir (hook'la ad çakışmaz); pitch-control ikisini de doğru adla import eder.
- ICU değişkenleri `counter` için `{ done, total }` — hem anahtar hem çağrı aynı.
- `stopPitch` davranışı değişmez; yalnızca buton etiketi/varyantı değişir. Mevcut `stopPitch` i18n anahtarı silinmez (geç dönüş/uyumluluk için kalır, ama artık kullanılmaz — zarar yok).
- Migration yok; RLS mevcut izinlerle çalışır (admin kendi etkinliğinin jury_scores ve jüri profиллerini okuyabiliyor).
