# Admin Pitch Ekranında Canlı Jüri Puanlama Durumu

**Tarih:** 2026-06-13
**Kapsam:** Yeni `hooks/use-jury-scoring-status.ts`, yeni `components/admin/jury-scoring-status.tsx`, `components/admin/pitch-control.tsx`, i18n

## Amaç

Admin, aktif sunum sırasında her jürinin o takımı puanlamayı tamamlayıp tamamlamadığını canlı görsün — jürilerin el/onay işareti vermesini beklemek yerine. Tüm jüriler tamamlayınca belirgin bir bildirim çıksın ve "Sonraki takımı çağır" butonu öne çıksın. Kontrol adminde kalır (otomatik geçiş yok).

İçerik:
- Aktif takım için jüri listesi + her birinin durumu (puanladı / bekleniyor), canlı.
- "{done}/{total} jüri tamamladı" sayacı.
- Hepsi tamamlanınca yeşil "Tüm jüriler puanladı" şeridi + vurgulu "Sonraki takımı çağır" butonu.
- Takım seçicide, o etkinlikte en az bir jüri puanı olan takımlar "(sundu)" etiketiyle işaretli.

## Veri Modeli (mevcut, değişiklik yok)

- `profiles` (role=`jury`, `event_id`): etkinliğin jürileri. Admin RLS ile okuyabiliyor (mevcut `jury-management` deseni: `.eq('role','jury').or('event_id.is.null,event_id.eq.<id>')`).
- `jury_scores` (`jury_id`, `team_id`, `scores`, `comments`, `created_at`): bir `(jury_id, team_id)` satırının varlığı = o jüri o takımı kaydetti (puanlama upsert ile tek satır; taslak durumu yok). Admin kendi etkinliğindeki satırları okuyabiliyor (`jury_scores_select_scoped`).

Migration gerekmez.

## Tasarım

### 1. Hook: `hooks/use-jury-scoring-status.ts`

İmza: `useJuryScoringStatus(eventId: string | null, teamId: string | null)`

Davranış:
- `teamId` veya `eventId` yoksa boş durum döner (`{ juries: [], scoredCount: 0, total: 0, allScored: false, isLoading: false }`).
- Yüklemede iki sorgu:
  - Jüriler: `supabase.from('profiles').select('id, full_name, display_name').eq('role','jury').or('event_id.is.null,event_id.eq.<eventId>')`.
  - Puanlayanlar: `supabase.from('jury_scores').select('jury_id').eq('team_id', teamId)`.
- `jury_scores` tablosuna `filter: team_id=eq.<teamId>` ile realtime kanalı (`admin-jury-status-<teamId>`); her `*` olayında puanlayanları yeniden çeker (mevcut `my-scores-list.tsx` deseni). Cleanup'ta `removeChannel`.
- `teamId` değişince state sıfırlanır ve yeniden yüklenir.
- Dönüş:
  ```ts
  interface JuryScoringStatusEntry { id: string; name: string; scored: boolean }
  interface JuryScoringStatus {
    juries: JuryScoringStatusEntry[]
    scoredCount: number
    total: number
    allScored: boolean   // total > 0 && scoredCount === total
    isLoading: boolean
  }
  ```
- `name`: `display_name || full_name || 'Jüri'`. `juries` ada göre sıralı (tutarlı görünüm).
- `allScored` yalnızca `total > 0` iken true (jüri yoksa "hepsi tamam" gösterilmez).

### 2. Sunum bileşeni: `components/admin/jury-scoring-status.tsx`

Props: `status: JuryScoringStatus` (hook'un dönüşü).

- `isLoading` → küçük spinner kartı.
- `total === 0` → "Bu etkinliğe atanmış jüri yok" bilgi notu.
- Aksi halde Card:
  - Başlık + "{scoredCount}/{total} jüri tamamladı" sayacı.
  - Her jüri satırı: ad + durum rozeti — `scored` ise yeşil `CheckCircle` "Puanladı", değilse soluk `Clock` "Bekleniyor".
  - `allScored` ise üstte yeşil şerit: "Tüm jüriler puanladı".
- Tamamen sunum bileşeni; kendi veri çekmez (hook pitch-control'de bir kez çağrılır).

### 3. `components/admin/pitch-control.tsx`

- `useJuryScoringStatus(event?.id ?? null, currentTeam?.id ?? null)` çağrılır (hook teamId yokken boş döner, koşulsuz çağrı React kurallarına uygun).
- Aktif sunum bloğunda (süre çubuğunun altına) `<JuryScoringStatus status={...} />` eklenir.
- Mevcut "Sunumu durdur" butonu metni **"Sonraki takımı çağır"** olur (aksiyon aynı `stopPitch`; current_team_id null'a çekilir, seçici geri gelir). `status.allScored` iken buton `variant` birincil/vurgulu olur ve üstünde kısa bildirim metni görünür; aksi halde mevcut görünümünü korur.
- Takım seçici: pitch-control bir kez etkinliğin puanlanmış `team_id` kümesini çeker — `supabase.from('jury_scores').select('team_id, teams!inner(event_id)').eq('teams.event_id', event.id)` (veya takım id listesi üzerinden `in`); küme `Set<string>` olarak tutulur. `onUpdate`/etkinlik değişiminde tazelenir. `SelectItem` içinde takım bu kümedeyse adın yanına `(sundu)` etiketi + soluk stil.

### 4. i18n (`messages/tr.json` + `en.json`, `admin.pitchControl` altına)

Yeni anahtarlar:
- `juryStatus.title` — "Jüri Puanlama Durumu" / "Jury Scoring Status"
- `juryStatus.counter` — "{done}/{total} jüri tamamladı" / "{done}/{total} juries done"
- `juryStatus.scored` — "Puanladı" / "Scored"
- `juryStatus.pending` — "Bekleniyor" / "Pending"
- `juryStatus.allDone` — "Tüm jüriler puanladı" / "All juries have scored"
- `juryStatus.noJuries` — "Bu etkinliğe atanmış jüri yok" / "No juries assigned to this event"
- `callNextTeam` — "Sonraki takımı çağır" / "Call next team"
- `alreadyPitched` — "sundu" / "pitched"

(Mevcut `stopPitch` anahtarı kaldırılmaz; yalnızca buton artık `callNextTeam` kullanır.)

## Kapsam Dışı

- Otomatik sonraki takıma geçiş.
- Kalıcı `has_pitched` alanı (teams tablosuna kolon eklemek).
- Jüri puan değerlerinin admin'e gösterilmesi (sadece tamamlandı/tamamlanmadı durumu).
- Jüriye "puanını tamamla" bildirimi/uyarısı göndermek.

## Doğrulama

1. `npx next lint --file` ilgili dosyalar + `npm run build` (proje düzeni: test yok).
2. Canlı test: PITCHING durumundaki bir etkinlikte (ör. "Dijital Hayatını Dengede Tut!") admin pitch ekranı açıkken bir takım sahneye çağrılır; bir jüri hesabı o takımı puanladığında admin ekranındaki ilgili satırın anlık "Puanladı"ya dönmesi ve sayaç/şerit güncellemesi izlenir; tüm jüriler tamamlayınca butonun vurgulanması doğrulanır.
