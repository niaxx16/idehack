# Jüri Puanlama: Slider Yerine Doğrudan Puan Kutusu

**Tarih:** 2026-06-12
**Kapsam:** `components/jury/scoring-form.tsx` + i18n mesajları

## Amaç

Jüri üyeleri puanlama yaparken slider sürüklemek yerine her kritere puanı doğrudan yazabilsin. Slider tamamen kaldırılır.

## Mevcut Durum

- 5 kriter (`problem_understanding`, `innovation`, `value_impact`, `feasibility`, `presentation_teamwork`), her biri 1–20 puan, toplam 100.
- Her kriterde varsayılan 10'dan başlayan bir `Slider` var; değer sağda renk kodlu büyük rakamla gösteriliyor.
- Jüri hiç dokunmasa bile tüm kriterler 10 olarak kaydedilebiliyor.

## Tasarım

### Puan kutusu
- Her kriter satırındaki `Slider` kaldırılır; yerine `inputMode="numeric"` metin kutusu gelir (mobilde sayısal klavye; `type="number"` spinner/scroll sorunlarından kaçınmak için text input).
- Sağdaki renk kodlu büyük rakam göstergesi kaldırılır; renk kodu kutunun kendisine uygulanır (değer geçerliyken rakam mevcut `SCORE_LEVELS` skalasıyla renklenir).
- Kutu büyük ve kolay dokunulabilir olur (örn. `h-12`, büyük punto, ortalanmış metin).

### Boş başlangıç
- Yeni değerlendirmede kutular **boş** açılır; jüri her kritere bilinçli puan yazmak zorundadır.
- Local state `Record<criterion, string>` olarak tutulur (boş string = doldurulmamış); kayıtta sayıya çevrilir.
- Kayıtlı puan düzenlenirken kutular mevcut değerlerle dolu gelir.

### Doğrulama
- Sadece rakam karakterleri kabul edilir (yapıştırma dahil).
- Geçerli aralık 1–20. Aralık dışı değerde kutu kırmızı kenarlık alır.
- 5 kutunun tamamı geçerli olana kadar **Kaydet butonu pasif** kalır ve butonun altında "tüm kriterleri puanlayın" ipucu görünür.

### Toplam puan
- Üstteki toplam, geçerli (dolu ve 1–20 aralığındaki) kutuların toplamını gösterir.

### i18n
- `messages/tr.json` ve `messages/en.json` içine `jury.scoringForm` altına yeni anahtar: doldurulmamış kriter ipucu (örn. `fillAllCriteria`).

## Değişmeyenler

- Veritabanı şeması, `jury_scores` upsert sorgusu, proje yolu önerisi (checkbox'lar), yorum alanı, kayıt/güncelleme akışı.
- Diğer bileşenler (`my-scores-list`, admin tarafı) etkilenmez.

## Test

- Boş formda Kaydet pasif; 5 kriter geçerli olunca aktif.
- 0, 21, harf, boş değer girişlerinde geçersiz durum gösterimi.
- Mevcut puan yüklendiğinde kutuların dolu gelmesi ve güncellemenin çalışması.
- `npm run build` / `npm run lint` temiz geçer.
