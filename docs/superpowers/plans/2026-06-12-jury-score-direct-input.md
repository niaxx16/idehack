# Jüri Puanlama Doğrudan Puan Kutusu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jüri puanlama formunda slider'ı kaldırıp her kritere doğrudan puan yazılabilen, boş başlayan, doğrulamalı sayı kutusu koymak.

**Architecture:** Tek bileşen değişikliği: `components/jury/scoring-form.tsx` içindeki `Slider` yerine `inputMode="numeric"` metin kutusu gelir. Local state sayı yerine string tutar (boş string = doldurulmamış); 5 kutu da geçerli (1–20) olana kadar Kaydet pasif kalır. Veritabanı ve kayıt sorgusu değişmez.

**Tech Stack:** Next.js 14, TypeScript, Shadcn/UI (`components/ui/input.tsx` mevcut), next-intl.

**Spec:** `docs/superpowers/specs/2026-06-12-jury-score-input-design.md`

**Not (test):** Projede test framework'ü yok (package.json'da sadece eslint var, jest/vitest yok). Bu plana test altyapısı eklemek kapsam dışıdır; doğrulama `npm run lint` + `npm run build` + manuel kontrol listesiyle yapılır.

---

### Task 1: i18n anahtarı ekle (`fillAllCriteria`)

**Files:**
- Modify: `messages/tr.json` (~satır 721, `jury.scoringForm` bloğunun sonu)
- Modify: `messages/en.json` (~satır 721, `jury.scoringForm` bloğunun sonu)

- [ ] **Step 1: tr.json'a anahtar ekle**

`messages/tr.json` içinde `jury.scoringForm` bloğunda `"alreadyScored"` satırını bulun:

```json
      "alreadyScored": "Bu takımı zaten puanladınız. Güncellemek için tıklayın."
```

Şu şekilde değiştirin (virgül + yeni anahtar):

```json
      "alreadyScored": "Bu takımı zaten puanladınız. Güncellemek için tıklayın.",
      "fillAllCriteria": "Kaydetmek için tüm kriterlere 1-20 arası puan girin"
```

- [ ] **Step 2: en.json'a anahtar ekle**

`messages/en.json` içinde `jury.scoringForm` bloğunda `"alreadyScored"` satırını bulun:

```json
      "alreadyScored": "You have already scored this team. Click to update."
```

Şu şekilde değiştirin:

```json
      "alreadyScored": "You have already scored this team. Click to update.",
      "fillAllCriteria": "Enter a score between 1-20 for all criteria to save"
```

- [ ] **Step 3: JSON geçerliliğini doğrula**

Çalıştır (proje kökü `C:\Users\Girisimci\Desktop\idehack\inovasprint`):

```powershell
node -e "JSON.parse(require('fs').readFileSync('messages/tr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"
```

Beklenen çıktı: `OK`

- [ ] **Step 4: Commit**

```powershell
git add messages/tr.json messages/en.json
git commit -m "Add fillAllCriteria i18n key for jury scoring form"
```

---

### Task 2: scoring-form.tsx — slider yerine puan kutusu

**Files:**
- Modify: `components/jury/scoring-form.tsx` (tüm dosya aşağıdaki içerikle değiştirilir)

Davranış özeti:
- `Slider` importu ve kullanımı kaldırılır; `Input` (`@/components/ui/input`) gelir.
- Puan state'i `Record<CriterionKey, string>` olur; boş string = doldurulmamış.
- Yeni değerlendirmede kutular boş; kayıtlı puan düzenlenirken değerlerle dolu gelir.
- Girişte rakam dışı karakterler süzülür (yapıştırma dahil), en fazla 2 hane.
- 1–20 dışı değerde (örn. 0, 21–99) kutu kırmızı; geçerli değerde mevcut `SCORE_LEVELS` rengi rakama uygulanır.
- 5 kutu da geçerli olmadan Kaydet pasif + butonun altında `fillAllCriteria` ipucu.
- Toplam puan geçerli kutuların toplamı.

- [ ] **Step 1: Dosyayı aşağıdaki içerikle tamamen değiştir**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Event, Team, JuryScoreData } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, CheckCircle, Route } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ScoringFormProps {
  event: Event
  team: Team
  juryId: string
  onScoreSubmitted: () => void
}

// 5 criteria, each 1-20 points, total 100
const SCORING_CRITERIA_KEYS = ['problem_understanding', 'innovation', 'value_impact', 'feasibility', 'presentation_teamwork'] as const
type CriterionKey = typeof SCORING_CRITERIA_KEYS[number]
const MAX_SCORE_PER_CRITERION = 20
const TOTAL_MAX_SCORE = 100

const SCORE_LEVELS = [
  { min: 1, max: 4, color: 'text-red-600' },
  { min: 5, max: 8, color: 'text-orange-600' },
  { min: 9, max: 12, color: 'text-yellow-600' },
  { min: 13, max: 16, color: 'text-blue-600' },
  { min: 17, max: 20, color: 'text-green-600' },
] as const

const PROJECT_PATH_KEYS = ['startup', 'tubitak2204', 'teknofest', 'socialApp'] as const
type ProjectPath = typeof PROJECT_PATH_KEYS[number]

function getScoreColor(value: number) {
  return SCORE_LEVELS.find(l => value >= l.min && value <= l.max)?.color || ''
}

// Empty string = criterion not scored yet
const emptyScoreInputs = (): Record<CriterionKey, string> => ({
  problem_understanding: '',
  innovation: '',
  value_impact: '',
  feasibility: '',
  presentation_teamwork: '',
})

function parseScore(raw: string): number | null {
  if (raw === '') return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= MAX_SCORE_PER_CRITERION ? n : null
}

export function ScoringForm({ event, team, juryId, onScoreSubmitted }: ScoringFormProps) {
  const t = useTranslations('jury.scoringForm')
  const [scoreInputs, setScoreInputs] = useState<Record<CriterionKey, string>>(emptyScoreInputs())
  const [comments, setComments] = useState('')
  const [projectPaths, setProjectPaths] = useState<ProjectPath[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [hasExistingScore, setHasExistingScore] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; key: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadExistingScore()
  }, [team.id, juryId])

  const loadExistingScore = async () => {
    const { data, error } = await supabase
      .from('jury_scores')
      .select('id, jury_id, team_id, scores, comments, created_at')
      .eq('jury_id', juryId)
      .eq('team_id', team.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading score:', error)
    }

    if (data) {
      const loadedScores = data.scores as any
      if (loadedScores.problem_understanding !== undefined) {
        // Only extract the 5 scoring criteria, exclude project_paths and other extra fields
        setScoreInputs({
          problem_understanding: String(loadedScores.problem_understanding),
          innovation: String(loadedScores.innovation),
          value_impact: String(loadedScores.value_impact),
          feasibility: String(loadedScores.feasibility),
          presentation_teamwork: String(loadedScores.presentation_teamwork),
        })
      } else {
        // Old format - reset to empty inputs
        setScoreInputs(emptyScoreInputs())
      }
      setComments(data.comments || '')
      setProjectPaths(loadedScores.project_paths || [])
      setHasExistingScore(true)
    } else {
      // Reset form for new team
      setScoreInputs(emptyScoreInputs())
      setComments('')
      setProjectPaths([])
      setHasExistingScore(false)
    }
  }

  const updateScoreInput = (criterion: CriterionKey, raw: string) => {
    // Digits only (also sanitizes pasted text), max 2 chars
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    setScoreInputs((prev) => ({
      ...prev,
      [criterion]: digits,
    }))
  }

  const allValid = SCORING_CRITERIA_KEYS.every((key) => parseScore(scoreInputs[key]) !== null)
  const totalScore = SCORING_CRITERIA_KEYS.reduce((sum, key) => sum + (parseScore(scoreInputs[key]) ?? 0), 0)

  const saveScore = async () => {
    if (!allValid) return

    const scores: JuryScoreData = {
      problem_understanding: parseScore(scoreInputs.problem_understanding)!,
      innovation: parseScore(scoreInputs.innovation)!,
      value_impact: parseScore(scoreInputs.value_impact)!,
      feasibility: parseScore(scoreInputs.feasibility)!,
      presentation_teamwork: parseScore(scoreInputs.presentation_teamwork)!,
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const { error } = await supabase
        .from('jury_scores')
        .upsert({
          jury_id: juryId,
          team_id: team.id,
          scores: { ...scores, project_paths: projectPaths },
          comments,
        }, { onConflict: 'jury_id,team_id' })

      if (error) throw error

      setHasExistingScore(true)
      setSaveMessage({ type: 'success', key: 'scoreSaved' })
      onScoreSubmitted()

      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save score:', error)
      setSaveMessage({ type: 'error', key: 'saveFailed' })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProjectPath = (path: ProjectPath) => {
    setProjectPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('totalScore')}</span>
            <span className="text-3xl font-bold">{totalScore}/{TOTAL_MAX_SCORE}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center text-[10px] font-medium">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">1–4</span>
            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">5–8</span>
            <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">9–12</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">13–16</span>
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">17–20</span>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">{t('scaleLevels')}</p>
        </div>

        {SCORING_CRITERIA_KEYS.map((criterionKey) => {
          const raw = scoreInputs[criterionKey]
          const parsed = parseScore(raw)
          const isInvalid = raw !== '' && parsed === null
          return (
            <div key={criterionKey} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <Label className="text-base font-semibold">
                    {t(criterionKey)} <span className="text-muted-foreground font-normal">({MAX_SCORE_PER_CRITERION}p)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(`${criterionKey}Desc`)}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                    {t(`${criterionKey}Indicators`)}
                  </p>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  placeholder="1-20"
                  value={raw}
                  onChange={(e) => updateScoreInput(criterionKey, e.target.value)}
                  aria-invalid={isInvalid}
                  className={`h-12 w-20 shrink-0 text-center text-2xl font-bold ${
                    isInvalid
                      ? 'border-red-500 text-red-600 focus-visible:ring-red-500'
                      : parsed !== null
                        ? getScoreColor(parsed)
                        : ''
                  }`}
                />
              </div>
            </div>
          )
        })}

        {/* Project Path Suggestion */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">{t('projectPathTitle')}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t('projectPathDesc')}</p>
          <div className="grid grid-cols-2 gap-3">
            {PROJECT_PATH_KEYS.map((pathKey) => (
              <label
                key={pathKey}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  projectPaths.includes(pathKey)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                <Checkbox
                  checked={projectPaths.includes(pathKey)}
                  onCheckedChange={() => toggleProjectPath(pathKey)}
                />
                <span className="text-sm font-medium">{t(`projectPaths.${pathKey}`)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comments">{t('comments')}</Label>
          <Textarea
            id="comments"
            placeholder={t('commentsPlaceholder')}
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        {saveMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              saveMessage.type === 'success'
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            {saveMessage.type === 'success' && (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{t(saveMessage.key)}</span>
          </div>
        )}

        <Button onClick={saveScore} disabled={isSaving || !allValid} className="w-full h-12 text-lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {hasExistingScore ? t('updateScore') : t('saveScore')}
            </>
          )}
        </Button>

        {!allValid && (
          <p className="text-xs text-center text-muted-foreground">
            {t('fillAllCriteria')}
          </p>
        )}

        {hasExistingScore && (
          <p className="text-xs text-center text-muted-foreground">
            {t('alreadyScored')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Lint çalıştır**

```powershell
npm run lint
```

Beklenen: hata yok (mevcut uyarılar varsa aynı kalır; bu dosyadan yeni hata gelmemeli).

- [ ] **Step 3: Build çalıştır**

```powershell
npm run build
```

Beklenen: derleme başarılı, tip hatası yok.

- [ ] **Step 4: Commit**

```powershell
git add components/jury/scoring-form.tsx
git commit -m "Replace jury scoring sliders with direct score inputs"
```

---

### Task 3: Manuel doğrulama (dev sunucusu)

**Files:** yok (sadece doğrulama)

- [ ] **Step 1: Dev sunucusunu başlat**

```powershell
npm run dev
```

http://localhost:3000/login adresinden bir jüri hesabıyla giriş yapın, `/jury` sayfasına gidin (PITCHING aşamasında bir takım seçili olmalı).

- [ ] **Step 2: Kontrol listesi**

- Yeni değerlendirmede 5 kutu boş açılıyor; Kaydet pasif ve altında "tüm kriterlere 1-20 arası puan girin" ipucu var.
- Kutuya harf yazılamıyor; yapıştırılan metinden sadece rakamlar kalıyor.
- `0` veya `21`+ girilince kutu kırmızı kenarlık alıyor ve Kaydet pasif kalıyor.
- 5 kutuya geçerli puan girilince toplam doğru hesaplanıyor, rakamlar renk skalasına göre renkleniyor ve Kaydet aktifleşiyor.
- Kaydet sonrası "Puan başarıyla kaydedildi!" görünüyor; aynı takıma dönünce kutular kayıtlı değerlerle dolu geliyor ve güncelleme çalışıyor.
- Mobil görünümde (dar ekran) sayısal klavye açılıyor ve satır düzeni bozulmuyor.

- [ ] **Step 3: Spec ve plan dosyalarıyla birlikte son durumu commit'le (gerekirse)**

Manuel doğrulamada sorun çıkarsa düzeltme yapılıp Task 2 Step 2-4 tekrarlanır.
