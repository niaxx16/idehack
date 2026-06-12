# Jüri Puanlama: Kriter Bazlı Maksimum Puanlar

**Tarih:** 2026-06-12
**Kapsam:** `types/index.ts`, `components/jury/scoring-form.tsx`, `components/admin/jury-evaluations-dialog.tsx`, i18n mesajları

## Amaç

Tüm kriterler 20 puan yerine kriter bazlı ağırlık kullanılsın (toplam 100 korunur):

| Kriter | Maks |
|---|---|
| problem_understanding | 20 |
| innovation | **30** |
| value_impact | 20 |
| feasibility | 20 |
| presentation_teamwork | **10** |

## Tasarım

### Tek kaynak: `JURY_CRITERION_MAX`
`types/index.ts` içine `Record<keyof JuryScoreData, number>` tipinde export edilen sabit. Form ve admin diyaloğu buradan okur.

### scoring-form.tsx
- `MAX_SCORE_PER_CRITERION` sabiti kalkar; etiket `({max}p)`, placeholder `1-{max}`, doğrulama (`parseScore(raw, max)`) kriter bazlı olur.
- Renk skalası mutlak aralıklar yerine **orana göre**: ≤%20 kırmızı, ≤%40 turuncu, ≤%60 sarı, ≤%80 mavi, ≤%100 yeşil. (20 puanlık kriterlerde eski aralıklarla birebir aynı sonucu verir.)
- Üstteki "1–4 / 5–8 / ..." çipleri seviye adlarına dönüşür (Başlangıç / Geliştirilmeli / Yeterli / İyi / Mükemmel — i18n'den), `scaleLevels` metni "renk skalası kriterin maksimumuna oranlıdır" açıklaması olur.

### jury-evaluations-dialog.tsx (admin)
- Kriter ortalaması `x / 20` yerine `x / {max}`; progress bar `avg*5` yerine `(avg/max)*100`.

### i18n (tr + en)
- `description`: "1-20 arası" yerine "kendi maksimum puanı üzerinden" ifadesi.
- `fillAllCriteria`: "1-20 arası" yerine "geçerli puan".
- `scaleLevels`: oran açıklaması.
- Yeni `levels` nesnesi: beginner/needsWork/adequate/good/excellent.

## Eski Veriler

Kayıtlı puanlara dokunulmaz; tamamlanmış etkinliklerin toplamları (≤100) sıralamada geçerli kalır. Eski ölçekli bir kayıt yeniden düzenlenirse form yeni sınırlarla doğrular (örn. eski Sunum 18 → kırmızı görünür, 1–10'a çekilmeden kaydedilemez). Kullanıcı bunu onayladı (puanlaması süren etkinlik yok).

## Değişmeyenler

`my-scores-list`, `jury-scores-overview`, `get_leaderboard` SQL (sadece toplama yapıyorlar, toplam hâlâ 100), veritabanı şeması.

## Test

- 20/30/20/20/10 maksimumları etikette, placeholder'da ve doğrulamada görünür.
- innovation=30 geçerli, 31 kırmızı; presentation=10 geçerli, 11 kırmızı.
- Renkler: 30'luk kriterde 6'ya kadar kırmızı, 25+ yeşil; 10'luk kriterde 2'ye kadar kırmızı, 9+ yeşil.
- Admin diyaloğunda ortalamalar doğru maksimumla ve doğru bar oranıyla görünür.
- `npm run build` geçer; lint bu dosyalarda yeni hata üretmez.
