# Etkinlik Sonrası Takım Karnesi

**Tarih:** 2026-06-12
**Kapsam:** Yeni migration (`get_team_report_card` RPC), `app/student/page.tsx`, yeni `components/student/report-card.tsx`, PDF dışa aktarma, i18n, tipler

## Amaç

Etkinlik `COMPLETED` olduğunda takımlar öğrenci ekranında bir "karne" görür ve PDF olarak indirebilir. Karne **gelişim odaklıdır**; sıralama ve yatırım bilgisi içermez. İçerik:

- Jüri puanları: kriter bazlı **ortalamalar** (tek tek jüri puanı görünmez) + toplam ortalama + jüri sayısı
- Jüri yorumları: **anonim** ("Jüri 1", "Jüri 2" …)
- Jürilerin önerdiği proje yolları: sayım olarak (örn. Teknofest ×2, Startup ×1)
- Mentör genel değerlendirmeleri (`mentor_evaluations`): **isimli**; metin + proje yolları + gerekçe
- Bölüm bazlı mentör geribildirimleri (`mentor_feedback`): isimli, kanvas bölümüne göre gruplu

## Tasarım

### 1. Migration: `supabase/migrations/add_team_report_card.sql`

`get_team_report_card(team_id_input UUID) RETURNS JSONB` — `SECURITY DEFINER`, `STABLE`, `SET search_path = public` (mevcut `get_leaderboard` deseni).

**Yetki (fonksiyon içinde):**
- Çağıranın `profiles.team_id = team_id_input` **ve** takımın etkinliği `COMPLETED` ise → izin.
- Çağıran `role = 'admin'` ve (süper admin **veya** etkinlik `created_by` sahibi) ise → her zaman izin (önizleme).
- Aksi halde `NULL` döner; istemci "karne henüz hazır değil" gösterir.

**Dönen JSON:**
```json
{
  "team_name": "…",
  "jury": {
    "jury_count": 3,
    "averages": { "problem_understanding": 15.3, "innovation": 24.0, "value_impact": 16.7, "feasibility": 14.3, "presentation_teamwork": 8.0 },
    "total_avg": 78.3,
    "comments": ["…", "…"],
    "project_paths": { "teknofest": 2, "startup": 1 }
  },
  "mentor_evaluations": [
    { "mentor_name": "…", "evaluation_text": "…", "project_paths": ["teknofest"], "project_path_reasoning": "…" }
  ],
  "section_feedback": [
    { "mentor_name": "…", "canvas_section": "problem", "feedback_text": "…" }
  ]
}
```

- Yalnızca **yeni formatlı** `jury_scores` satırları dahil edilir (`scores ? 'problem_understanding'`); eski formatlı kayıtlar yok sayılır. Hiç yeni formatlı puan yoksa `jury` bloğunda `jury_count: 0` döner.
- Ortalamalar `ROUND(…, 1)`.
- `comments`: boş/sadece-boşluk yorumlar elenir, `created_at` sırasıyla listelenir; jüri kimliği hiçbir biçimde dönmez.
- `project_paths`: `scores->'project_paths'` dizilerinin elemanları sayılır.
- `mentor_evaluations`: `profiles.full_name` join'i ile; `evaluation_text` ve `project_paths` ikisi de boş olan satırlar elenir.

Bölüm bazlı `mentor_feedback` da RPC'ye **dahildir** (`section_feedback` dizisi: mentor_name, canvas_section, feedback_text). Gerekçe: öğrenciler RLS gereği mentör profillerini okuyamadığından istemci tarafı join'de isimler boş kalıyordu; SECURITY DEFINER fonksiyonda isimler çözülür ve tek erişim yolu kalır.

### 2. Öğrenci ekranı: `app/student/page.tsx` + `components/student/report-card.tsx`

- `page.tsx`'e `isCompleted` bayrağı eklenir ve faz dallanmasının **en başına** konur: `isCompleted ? <ReportCard …> : isWaiting ? …`
- `ReportCard` props: `teamId`, `teamName`, `eventName`. Mount'ta tek sorgu: `rpc('get_team_report_card')`; bölüm geribildirimleri RPC'nin `section_feedback` alanından `canvas_section`'a göre gruplanır.
- Bölümler (verisi olmayan bölüm gizlenir):
  1. Başlık kartı: kutlama mesajı + etkinlik adı + PDF indir butonu
  2. **Jüri Değerlendirmesi:** kriter başına `ortalama / maksimum` (maksimumlar `JURY_CRITERION_MAX`) ve oran bazlı progress bar; altta büyük toplam ortalama (`x / 100`) ve "N jüri değerlendirdi" notu
  3. **Jüri Yorumları:** anonim alıntı kartları ("Jüri 1" …)
  4. **Önerilen Proje Yolları:** jüri sayımlarından rozetler ("Teknofest ×2"); mentör önerileri kendi kartlarında görünür, bu bölüme karışmaz
  5. **Mentör Değerlendirmeleri:** isimli kartlar (metin + yol rozetleri + gerekçe)
  6. **Bölüm Bazlı Mentör Geribildirimleri:** kanvas bölüm başlıklarıyla gruplu
- Boş durumlar: RPC `NULL` → "karne hazır değil" kartı; `jury_count: 0` → jüri bölümleri yerine "bu etkinlikte takımınız jüri tarafından puanlanmadı" mesajı, mentör bölümleri yine gösterilir.

### 3. PDF: `components/student/report-card.tsx` içinde jsPDF

`canvas-pdf-export.tsx` deseni: jsPDF + `registerTurkishFont`, A4 dikey, sayfa taşması kontrolü. Gövde metinleri **tam siyah** (0,0,0), ikincil metinler gray-700 (silik PDF düzeltmesiyle tutarlı). Ekrandaki bölümlerin aynısı; dosya adı `{TakımAdı}_Karne.pdf`. Üretim, ekrana zaten yüklenmiş veriden yapılır (yeniden sorgu yok).

### 4. i18n + tipler

- `messages/tr.json` ve `en.json`: `student.reportCard.*` (başlık, bölüm başlıkları, "Jüri {n}", boş durumlar, PDF butonu). Proje yolu adları için mevcut `jury.scoringForm.projectPaths.*` anahtarları yeniden kullanılır.
- `types/index.ts`: `TeamReportCard` arayüzü (RPC dönüş şekli).
- `types/database.ts`: `get_team_report_card` Functions girdisi (üretici betik `scripts/generate-database-types.mjs` ile uyumlu).

## Kapsam Dışı

- Admin panelinde karne görüntüleme arayüzü (RPC admin'e izin verdiği için sonradan eklenmesi ucuz).
- Eski formatlı jüri puanlarının karneye çevrilmesi.
- Karne için ayrı paylaşım linki / oturum dışı erişim.

## Doğrulama

1. `npm run lint` + `npm run build` (proje düzeni: test yok).
2. Migration Supabase SQL Editor'de çalıştırılır.
3. Canlı test: "Dijital Hayatını Dengede Tut!" (COMPLETED, puanlanmış takımlar mevcut) etkinliğinde bir takım hesabıyla karne görüntülenir ve PDF indirilir; başka takımın `team_id`'siyle RPC çağrısının `NULL` döndüğü kontrol edilir.
