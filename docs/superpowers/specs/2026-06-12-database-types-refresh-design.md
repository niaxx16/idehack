# types/database.ts Canlı Şemadan Yenileme

**Tarih:** 2026-06-12
**Kapsam:** `types/database.ts` (yeniden üretim), `scripts/generate-database-types.mjs` (yeni)

## Problem

`types/database.ts` güncel değil: canlı veritabanında 12 tablo ve 11 RPC fonksiyonu varken dosyada 6 tablo ve 3 fonksiyon var; `jury_scores.scores` eski 4 kriterli formatta tanımlı. Bu yüzden projede ~146 `tsc` hatası var ve build'de tip denetimi atlanıyor.

## Tasarım

### Kaynak: canlı veritabanı (PostgREST OpenAPI)
Migration'lar SQL Editor'da elle çalıştırıldığı için dosyalar canlı şemadan sapabilir; gerçek durum `{SUPABASE_URL}/rest/v1/` OpenAPI çıktısından okunur (service role key ile, `.env.local`'den).

### Üretici betik: `scripts/generate-database-types.mjs`
- `.env.local`'den URL + service role key okur, OpenAPI'yi fetch eder.
- Her tablo için `Row`/`Insert`/`Update`/`Relationships` üretir (resmi `supabase gen types` çıktı formatında):
  - Nullability: OpenAPI `required` dizisi = NOT NULL kolonlar.
  - Insert opsiyonelliği: default'u olan veya nullable kolonlar `?` alır.
  - FK'lar kolon açıklamalarındaki `<fk table='..' column='..'/>` etiketinden; constraint adı PG varsayılanıyla (`{tablo}_{kolon}_fkey`) sentezlenir.
- `jsonb`/`json` kolonlar → `Json` (resmi konvansiyon; yapısal tipler `types/index.ts`'te).
- Enum kolonlar (`format` = enum tip adı, `enum` = değerler) → hem kolon tipi union hem `Enums` bölümü.
- RPC fonksiyonları: argümanlar OpenAPI body şemasından; dönüş tipleri betikteki `FUNCTION_RETURNS` haritasından (migration SQL'lerindeki `RETURNS` tanımlarından doğrulandı: çoğu `JSONB`→`Json`, `is_admin`/`setup_team_name`→boolean, `generate_personal_code`→string, `get_leaderboard`/`get_top_investors`→TABLE satır dizisi, `tmp_ping` SQL'de yok→`Json`).
- Çıktıyı `types/database.ts`'e yazar. Yeniden üretim: `node scripts/generate-database-types.mjs`.

## Başarı Ölçütü

- 12 tablo + 11 fonksiyon tipli; `tsc` hata sayısı 146'dan belirgin şekilde düşer (sıfır beklenmez — gevşek kullanımlar kalır).
- `npm run build` geçer; lint yeni hata üretmez.
- `scoring-form.tsx` upsert ve `stream-viewer.tsx` tablo adı hataları kaybolur.

## Değişmeyenler

`types/index.ts` uygulama tipleri, bileşen kodu, veritabanının kendisi.
