# InovaSprint - Hackathon Yönetim Platformu

Lise ideathon ve hackathon etkinliklerini yönetmek için kapsamlı bir Progressive Web App (PWA). Masaüstü kiosk modu, mobil öğrenci katılımı ve uzaktan jüri değerlendirmesi için hibrit destek sunar.

## Özellikler

### Çoklu Rol Sistemi
- **Super Admin**: Tüm eventleri ve adminleri yönetir, sistem sahibi
- **Admin**: Kendi oluşturduğu etkinlikleri, takımları, mentörleri ve jürileri yönetir
- **Mentor**: Atandığı takımlara geri bildirim verir, canvas'ları inceler
- **Jüri**: Canlı yayını izler, takımları puanlar
- **Öğrenci (Mobil)**: Gerçek zamanlı sunum izleme, notlar, hype reaksiyonları, portföy oylaması

### Temel Yetenekler
- **Çoklu Dil Desteği**: Türkçe ve İngilizce - etkinlik bazında dil seçimi
- **Admin İzolasyonu**: Her admin sadece kendi oluşturduğu etkinlikleri görür (güvenlik)
- **Hibrit Katılım**: QR kod tabanlı takım katılımı, anonim kimlik doğrulama
- **Gerçek Zamanlı Güncellemeler**: Supabase Realtime ile canlı etkinlik durumu
- **İşbirlikçi Canvas**: Takım üyeleri birlikte fikir ekler, kaptan final kararı yazar
- **Mentor Geri Bildirimi**: Mentörler canvas bölümlerine geri bildirim verir
- **Dosya Yükleme**: Sunum dosyaları (PDF/PPT/DOCX) Supabase Storage'da saklanır
- **Hype Sistemi**: Realtime Broadcast ile canlı reaksiyon animasyonları
- **Portföy Oylaması**: Öğrenciler sanal para ile takımlara yatırım yapar
- **Jüri Puanlama**: Çok kriterli değerlendirme (Yenilikçilik, Sunum, Uygulanabilirlik, Etki)
- **Sıralama**: Jüri puanları (%70) ve öğrenci yatırımları (%30) ağırlıklı skor

## Teknoloji Yığını

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **UI Bileşenleri**: Shadcn/UI, Lucide React ikonları
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Durum Yönetimi**: Zustand
- **Çoklu Dil**: next-intl
- **Form İşleme**: React Hook Form + Zod doğrulama
- **PWA**: next-pwa ile service worker desteği

## Kurulum Talimatları

### 1. Gereksinimler
- Node.js 18+ ve npm
- Supabase hesabı (ücretsiz tier yeterli)

### 2. Supabase Projesi Oluştur
1. [supabase.com](https://supabase.com) adresine gidin ve yeni proje oluşturun
2. Veritabanının hazırlanmasını bekleyin

### 3. Veritabanı Kurulumu
1. Supabase Dashboard'da SQL Editor'a gidin
2. `supabase/schema.sql` içeriğini kopyalayın
3. SQL'i yapıştırın ve çalıştırın
4. `supabase/migrations/` klasöründeki tüm migration dosyalarını sırayla çalıştırın

### 4. Storage Bucket Yapılandırması
1. Supabase Dashboard'da Storage'a gidin
2. `presentations` adında yeni bucket oluşturun
3. **Private** olarak ayarlayın (public değil)

### 5. Ortam Değişkenleri
1. `.env.local.example` dosyasını `.env.local` olarak kopyalayın
2. Supabase kimlik bilgilerinizi Settings > API'den alın ve doldurun

### 6. Kurulum & Çalıştırma
```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini ziyaret edin

### 7. Super Admin Oluşturma
Supabase Dashboard'da:
1. Authentication > Users'a gidin
2. Email/şifre ile kullanıcı oluşturun
3. SQL Editor'a gidin ve çalıştırın:
```sql
UPDATE profiles
SET role = 'admin', is_super_admin = true
WHERE id = 'kullanıcı-id-niz';
```

## Kullanım Kılavuzu

### Etkinlik Akışı
```
WAITING → IDEATION → LOCKED → PITCHING → VOTING → COMPLETED
(Bekleme)  (Fikir)   (Kilitli) (Sunum)   (Oylama)  (Tamamlandı)
```

### Admin Paneli
1. `/login` adresinden giriş yapın
2. **Adminler** sekmesinde yeni adminler oluşturun
3. **Etkinlikler** sekmesinde etkinlik oluşturun (dil seçin)
4. **Takımlar** sekmesinde takımları toplu oluşturun
5. **Mentorlar** sekmesinde mentor ekleyip takımlara atayın
6. **Jüri** sekmesinde jüri üyeleri oluşturun
7. **Etkinlik Kontrolü** ile aşamaları yönetin
8. **Sunum Kontrolü** ile sunumları yönetin
9. **Sıralama** ile sonuçları görüntüleyin

### Mentor Paneli
1. `/login` adresinden mentor kimlik bilgileriyle giriş yapın
2. Atanan takımları görüntüleyin
3. Canvas bölümlerine geri bildirim verin
4. Takım fikirlerini inceleyin

### Jüri Paneli
1. `/login` adresinden jüri kimlik bilgileriyle giriş yapın
2. `/jury` sayfasında bölünmüş ekran görünümü
3. Canlı yayını izleyin (admin stream URL ayarlar)
4. Takımları gerçek zamanlı puanlayın

### Öğrenci/Takım Görünümü
1. QR kodu tarayın veya `/join` adresinden katılın
2. Takım adı belirleyin, Canvas üzerinde çalışın
3. Sunum dosyası yükleyin
4. Sunumları izleyin, not alın
5. Oylama aşamasında yatırım yapın

## Veritabanı Şeması

### Temel Tablolar
- `events`: Etkinlik durumu, dil, created_by (admin izolasyonu)
- `teams`: Takım verileri, canvas, sunumlar
- `profiles`: Kullanıcı profilleri, roller, event_id
- `user_notes`: Öğrenci özel notları
- `transactions`: Portföy yatırımları
- `jury_scores`: Jüri değerlendirmeleri
- `canvas_contributions`: İşbirlikçi canvas katkıları
- `team_decisions`: Takım kaptanı kararları
- `mentor_assignments`: Mentor-takım atamaları
- `mentor_feedback`: Mentor geri bildirimleri

### Güvenlik (RLS)
- Admin izolasyonu: Her admin sadece kendi event'lerini görür
- Super admin: Tüm verilere erişim
- Mentor/Jüri: Sadece atandıkları event'e erişim

## Dağıtım

Vercel'e dağıtım:
```bash
npm run build
```

Production ortam değişkenlerinde `NEXT_PUBLIC_APP_URL`'i güncelleyin.

## Lisans

MIT Lisansı

---

Bu uygulama Bursa İl Milli Eğitim Müdürlüğü Ar-Ge Birimi tarafından vibe coding yöntemiyle geliştirilmiştir.
