# types/database.ts Yenileme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `types/database.ts`'i canlı Supabase şemasından otomatik üretmek ve üretici betiği repoya eklemek.

**Architecture:** `scripts/generate-database-types.mjs` PostgREST OpenAPI çıktısını (service role key ile) okuyup resmi `supabase gen types` formatında `types/database.ts` üretir. RPC dönüş tipleri betikte sabit haritada tutulur (OpenAPI vermez).

**Tech Stack:** Node 22 (yerleşik fetch), TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-12-database-types-refresh-design.md`

**Not (test):** Doğrulama `npx tsc --noEmit` hata sayısı karşılaştırması (önce: 146), `npm run build` ve lint ile yapılır.

---

### Task 1: Üretici betik

**Files:**
- Create: `scripts/generate-database-types.mjs`
- Delete: `scripts/inspect-openapi.mjs` (geçici keşif betiği, commit edilmemişti)

- [ ] **Step 1: Betiği yaz** — tam kod uygulamada (`scripts/generate-database-types.mjs`); ana parçalar:
  - `.env.local` ayrıştırma → `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `tsType(prop)`: `format` jsonb/json veya `type` yok → `Json`; `enum` → union; integer/number → `number`; boolean → `boolean`; string → `string`; array → `items[]`
  - Row: `required` setinde değilse `| null`; Insert: default'lu veya nullable kolonlar `?`; Update: hepsi `?`
  - Relationships: description'daki `<fk table='X' column='Y'/>` → `{ foreignKeyName: "{tablo}_{kolon}_fkey", columns: [kolon], isOneToOne: false, referencedRelation: X, referencedColumns: [Y] }`
  - Enums: `prop.enum` görülen kolonlardan `format` adıyla toplanır
  - Functions: `/rpc/*` body şemasından Args; Returns `FUNCTION_RETURNS` haritasından (`get_leaderboard` ve `get_top_investors` TABLE satır dizileri, `is_admin`/`setup_team_name` boolean, `generate_personal_code` string, kalanlar `Json`)
  - Çıktı `types/database.ts`'e yazılır, başına "auto-generated, elle düzenlemeyin, `node scripts/generate-database-types.mjs` ile yenileyin" yorumu konur

- [ ] **Step 2: Çalıştır**

```powershell
node scripts/generate-database-types.mjs
```

Beklenen: `types/database.ts written (12 tables, 11 functions)` benzeri özet.

- [ ] **Step 3: Çıktıyı gözden geçir** — 12 tablo, FK'lar, enum'lar, fonksiyon imzaları makul mü?

### Task 2: Doğrulama ve commit

- [ ] **Step 1: tsc hata sayısı** — `npx tsc --noEmit` → 146'dan düşmeli; `scoring-form.tsx` ve `stream-viewer.tsx` tablo/upsert hataları kaybolmalı.
- [ ] **Step 2: Build + lint** — `npm run build` geçer; `npx next lint --file types/database.ts` yeni hata yok.
- [ ] **Step 3: Commit + push**

```powershell
git add types/database.ts scripts/generate-database-types.mjs
git commit -m "Regenerate database types from live schema; add generator script"
git push origin main
```
