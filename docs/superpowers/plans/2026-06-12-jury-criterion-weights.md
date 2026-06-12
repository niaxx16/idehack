# Kriter Bazlı Jüri Puan Ağırlıkları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jüri puanlama kriterlerine farklı maksimum puanlar vermek: 20/30/20/20/10 (toplam 100).

**Architecture:** Maksimumlar `types/index.ts` içindeki `JURY_CRITERION_MAX` sabitinden okunur (tek kaynak). Puanlama formu doğrulama/etiket/placeholder/renk skalasını bu haritadan türetir; admin değerlendirme diyaloğu ortalama gösterimini buna göre düzeltir. Renk skalası orana (%20'lik dilimler) çevrilir.

**Tech Stack:** Next.js 14, TypeScript, next-intl.

**Spec:** `docs/superpowers/specs/2026-06-12-jury-criterion-weights-design.md`

**Not (test):** Projede test framework'ü yok; doğrulama dosya bazlı `next lint --file`, `npm run build` ve manuel kontrolle yapılır.

---

### Task 1: `JURY_CRITERION_MAX` sabiti

**Files:**
- Modify: `types/index.ts` (JuryScoreData interface'inin hemen altı, ~satır 118)

- [ ] **Step 1: Sabiti ekle**

`export interface JuryScoreData { ... }` bloğunun kapanışından sonra ekle:

```ts
// Per-criterion maximum scores (total 100)
export const JURY_CRITERION_MAX: Record<keyof JuryScoreData, number> = {
  problem_understanding: 20,
  innovation: 30,
  value_impact: 20,
  feasibility: 20,
  presentation_teamwork: 10,
}
```

---

### Task 2: i18n güncellemeleri

**Files:**
- Modify: `messages/tr.json` (`jury.scoringForm`)
- Modify: `messages/en.json` (`jury.scoringForm`)

- [ ] **Step 1: tr.json**

```json
"description": "Her kriteri kendi maksimum puanı üzerinden değerlendirin (Toplam 100 puan)",
"scaleLevels": "Renk skalası her kriterin maksimum puanına oranlıdır",
"fillAllCriteria": "Kaydetmek için tüm kriterlere geçerli puan girin",
"levels": {
  "beginner": "Başlangıç",
  "needsWork": "Geliştirilmeli",
  "adequate": "Yeterli",
  "good": "İyi",
  "excellent": "Mükemmel"
}
```

- [ ] **Step 2: en.json**

```json
"description": "Rate each criterion out of its maximum score (Total 100 points)",
"scaleLevels": "Color scale is relative to each criterion's maximum score",
"fillAllCriteria": "Enter a valid score for all criteria to save",
"levels": {
  "beginner": "Beginner",
  "needsWork": "Needs Work",
  "adequate": "Adequate",
  "good": "Good",
  "excellent": "Excellent"
}
```

- [ ] **Step 3: JSON doğrula** (`node -e "JSON.parse(...)"` her iki dosya için, beklenen `OK`)

---

### Task 3: scoring-form.tsx kriter bazlı maksimum

**Files:**
- Modify: `components/jury/scoring-form.tsx`

- [ ] **Step 1: Import ve sabitler**

```tsx
import { Event, Team, JuryScoreData, JURY_CRITERION_MAX } from '@/types'
```

`const MAX_SCORE_PER_CRITERION = 20` satırını sil. `SCORE_LEVELS` ve `getScoreColor`'ı orana çevir:

```tsx
// Color bands as a fraction of the criterion's max score
const SCORE_LEVELS = [
  { maxRatio: 0.2, color: 'text-red-600' },
  { maxRatio: 0.4, color: 'text-orange-600' },
  { maxRatio: 0.6, color: 'text-yellow-600' },
  { maxRatio: 0.8, color: 'text-blue-600' },
  { maxRatio: 1, color: 'text-green-600' },
] as const

function getScoreColor(value: number, max: number) {
  return SCORE_LEVELS.find(l => value <= l.maxRatio * max)?.color || ''
}
```

- [ ] **Step 2: parseScore'a max parametresi**

```tsx
function parseScore(raw: string, max: number): number | null {
  if (raw === '') return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null
}
```

Tüm çağrılar `parseScore(scoreInputs[key], JURY_CRITERION_MAX[key])` biçimine geçer (`allValid`, `totalScore`, `saveScore` içindeki 5 alan, render içindeki `parsed`).

- [ ] **Step 3: Lejant çiplerini seviye adlarına çevir**

```tsx
<div className="flex flex-wrap gap-1.5 justify-center text-[10px] font-medium">
  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">{t('levels.beginner')}</span>
  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">{t('levels.needsWork')}</span>
  <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">{t('levels.adequate')}</span>
  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{t('levels.good')}</span>
  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">{t('levels.excellent')}</span>
</div>
```

- [ ] **Step 4: Kriter satırında max kullan**

`SCORING_CRITERIA_KEYS.map` içinde:

```tsx
const max = JURY_CRITERION_MAX[criterionKey]
const parsed = parseScore(raw, max)
```

Etiket: `({max}p)` — Input: `placeholder={`1-${max}`}` — renk: `getScoreColor(parsed, max)`.

- [ ] **Step 5: Lint + build**

```powershell
npx next lint --file components/jury/scoring-form.tsx
npm run build
```

Beklenen: bu değişiklikten yeni lint hatası yok (3 eski bulgu kalır), build başarılı.

- [ ] **Step 6: Commit** (Task 1+2+3 birlikte: types, messages, scoring-form)

---

### Task 4: Admin jüri değerlendirme diyaloğu

**Files:**
- Modify: `components/admin/jury-evaluations-dialog.tsx:142-144`

- [ ] **Step 1: Import**

```tsx
import { Team, JuryScore, Profile, JURY_CRITERION_MAX } from '@/types'
```

- [ ] **Step 2: Ortalama satırını düzelt**

```tsx
<span className="font-medium">{averages[key]?.toFixed(1) || 0} / {JURY_CRITERION_MAX[key]}</span>
```
ve
```tsx
<Progress value={((averages[key] || 0) / JURY_CRITERION_MAX[key]) * 100} className="h-2" />
```

- [ ] **Step 3: Lint + build + commit**

```powershell
npx next lint --file components/admin/jury-evaluations-dialog.tsx
npm run build
git add components/admin/jury-evaluations-dialog.tsx
git commit -m "Show per-criterion max in admin jury evaluations dialog"
```

---

### Task 5: Manuel doğrulama

- Formda etiketler 20p/30p/20p/20p/10p; placeholder'lar 1-20/1-30/1-20/1-20/1-10.
- innovation'a 30 geçerli (yeşil), 31 girilemez mi kontrol (2 hane sınırı 31'e izin verir → kırmızı olmalı); presentation'a 11 kırmızı.
- 5 geçerli puanla toplam doğru; Kaydet aktif.
- Admin → takım takibi → jüri değerlendirmeleri diyaloğunda `x / 30`, `x / 10` gösterimi ve bar oranları doğru.
