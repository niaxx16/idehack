# Tip Hatası Temizliği Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 49 `tsc` hatasını sıfırlamak ve build'de TypeScript denetimini açmak.

**Architecture:** Supabase sorgu/RPC sonuçları sınırda uygulama tiplerine cast edilir; mantık değişmez. RPC sonuç tipleri `types/index.ts`'e eklenir. Sonda `next.config.mjs`'de `ignoreBuildErrors` kapatılır.

**Spec:** `docs/superpowers/specs/2026-06-12-typecheck-cleanup-design.md`

**Not:** Düzeltmeler dosya-dosya mekanik cast/guard işlemleri; her batch sonrası `npx tsc --noEmit` ile sayı düşüşü doğrulanır. Davranış değişikliği yasak — sadece tip düzeyi.

### Task 1: RPC sonuç tipleri (`types/index.ts`)
- [ ] `JoinTeamResult`, `SubmitPortfolioResult`, `RejoinResult` interface'leri eklenir (SQL fonksiyon gövdelerindeki `json_build_object` alanlarından).

### Task 2: RPC çağrı yerleri
- [ ] `app/join/page.tsx` — `authData.user` null guard
- [ ] `app/join/setup/page.tsx` — rpc sonuçlarını `JoinTeamResult` cast (5 hata)
- [ ] `app/rejoin/page.tsx` — `RejoinResult` cast
- [ ] `components/student/portfolio-voting.tsx` — votes `as unknown as Json`, sonuç `SubmitPortfolioResult` cast, null guard (5 hata)

### Task 3: Canvas / karar / geri bildirim cast'leri
- [ ] `app/mentor/page.tsx` — assignment cast, `canvas_data as unknown as CanvasData` (10 hata)
- [ ] `app/student/page.tsx` — team_members, feedback, contribution, decision cast'leri (4)
- [ ] `components/mentor/team-canvas-view.tsx` (3), `components/jury/stream-viewer.tsx` (1), `components/student/pitch-viewer.tsx` (1), `components/student/collaborative-canvas-section.tsx` (2) — TeamDecision/feedback/contribution cast'leri
- [ ] `components/team/canvas-form.tsx` — defaultValues cast + submit handler (2)
- [ ] `components/student/canvas-pdf-export.tsx`, `components/student/notes-manager.tsx` — null fallback (2)

### Task 4: Admin bileşenleri
- [ ] `components/admin/event-management.tsx` — language `'tr'|'en'` cast (3)
- [ ] `components/admin/investments-overview.tsx` — `Array.from(set)` (1)
- [ ] `components/admin/team-management.tsx` (2), `team-canvas-viewer.tsx` (2), `jury-scores-overview.tsx` (1), `mentor-evaluations-dialog.tsx` (1), `pitch-control.tsx` (1), `top-investors.tsx` (1) — Json/satır cast'leri

### Task 5: Tip denetimini aç ve doğrula
- [ ] `npx tsc --noEmit` → 0 hata
- [ ] `next.config.mjs`'de `typescript.ignoreBuildErrors` kaldır
- [ ] `npm run build` → tip denetimiyle başarılı
- [ ] Commit + push
