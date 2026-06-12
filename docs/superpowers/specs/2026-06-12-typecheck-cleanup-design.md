# Kalan 49 Tip Hatasının Temizlenmesi ve Build'de Tip Denetimi

**Tarih:** 2026-06-12
**Kapsam:** 21 bileşen/sayfa dosyası, `types/index.ts` (RPC sonuç tipleri), `next.config.mjs` (tip denetimini açma)

## Problem

`types/database.ts` canlı şemadan yenilenince gerçek tip uyumsuzlukları görünür oldu (49 hata). Kaynakları:

1. **RPC sonuçları `Json` dönüyor** (`join_team_by_code`, `submit_portfolio`, `rejoin_with_personal_code`...) ama kod `.success`, `.team_id` gibi alanlara doğrudan erişiyor.
2. **Null olabilen kolonlar**: canlı DB'de `created_at`/`assigned_at`/`is_read` gibi kolonlar nullable; uygulama tipleri (`TeamDecision`, `MentorFeedback`...) non-null bekliyor.
3. **`canvas_data`/`team_members` artık `Json`**: `.problem` gibi alan erişimleri cast istiyor.
4. **Ufak null guard eksikleri** (`authData.user`, `data.title`), `Set` iterasyonu (TS2802), `language` union/string uyumsuzluğu.

## Tasarım

- **Sınırda cast**: Supabase sorgu/RPC sonuçları, satır verisinin uygulamadaki karşılığına tek noktada cast edilir (`as X` veya Json için `as unknown as X`). Uygulama tipleri (`TeamDecision` vb.) değiştirilmez — pratikte bu kolonlar DB default'larıyla hep dolu geldiği için non-null sözleşme doğru.
- **RPC sonuç tipleri** `types/index.ts`'e eklenir: `JoinTeamResult`, `SubmitPortfolioResult`, `RejoinResult` (mevcut SQL fonksiyonlarının döndürdüğü alanlarla).
- **Null guard'lar**: erişim öncesi erken dönüş veya `?? ''`.
- **`Set` iterasyonu**: `Array.from(...)`.
- **`language`**: Select callback'inde `as 'tr' | 'en'` cast.
- **Son adım**: tüm hatalar sıfırlanınca `next.config.mjs`'de `typescript.ignoreBuildErrors` kaldırılır/false yapılır — build artık tip hatasında kırılır. (ESLint build denetimi açılmaz; yüzlerce eski lint hatası ayrı iş.)

## Başarı Ölçütü

`npx tsc --noEmit` → 0 hata; tip denetimi açıkken `npm run build` başarılı.

## Değişmeyenler

Çalışma zamanı davranışı (yalnızca tip düzeyinde cast/guard; mantık değişmez), veritabanı, `types/database.ts` (üretilmiş dosya).
