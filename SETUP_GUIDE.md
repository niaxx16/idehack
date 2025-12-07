# InovaSprint - Detaylı Kurulum Kılavuzu

Bu kılavuz, InovaSprint platformunu sıfırdan kurmanız için adım adım yol gösterir.

## İçindekiler
1. [Gereksinimler](#gereksinimler)
2. [Supabase Kurulumu](#supabase-kurulumu)
3. [Yerel Geliştirme](#yerel-geliştirme)
4. [Platformu Test Etme](#platformu-test-etme)
5. [Dağıtım](#dağıtım)

## Gereksinimler

### Gerekli Yazılımlar
- **Node.js** 18 veya üzeri ([İndir](https://nodejs.org/))
- **npm** (Node.js ile birlikte gelir)
- **Git** (isteğe bağlı, versiyon kontrolü için)
- Modern web tarayıcısı (Chrome, Firefox, Safari, Edge)

### Gerekli Hesaplar
- **Supabase Hesabı** (ücretsiz tier yeterli) - [Kayıt Ol](https://supabase.com)

## Supabase Kurulumu

### Adım 1: Yeni Proje Oluştur

1. [supabase.com](https://supabase.com) adresine gidin ve giriş yapın
2. **"New Project"** butonuna tıklayın
3. Organizasyonunuzu seçin (veya oluşturun)
4. Proje detaylarını doldurun:
   - **Name**: InovaSprint
   - **Database Password**: (güvenli bir şifre seçin ve saklayın)
   - **Region**: Size en yakın bölgeyi seçin
5. **"Create new project"** butonuna tıklayın
6. Hazırlık için 2-3 dakika bekleyin

### Adım 2: Veritabanı Kurulumu

1. Supabase Dashboard'da **SQL Editor**'a tıklayın
2. **"New query"** butonuna tıklayın
3. Projenizdeki `supabase/schema.sql` dosyasını açın
4. Tüm içeriği kopyalayın
5. SQL Editor'a yapıştırın
6. **"Run"** butonuna tıklayın (veya Ctrl/Cmd + Enter)
7. "Success. No rows returned" mesajını görmelisiniz

Bu işlem şunları oluşturur:
- Temel tablolar (events, teams, profiles, user_notes, transactions, jury_scores)
- Durum tipleri için enum'lar
- Row Level Security politikaları
- Veritabanı fonksiyonları
- Timestamp trigger'ları

### Adım 3: Migration Dosyalarını Çalıştır

`supabase/migrations/` klasöründeki dosyaları sırayla çalıştırın:

1. `add_full_name_to_profiles.sql`
2. `add_event_to_profiles.sql`
3. `add_event_language.sql`
4. `add_admin_expiration.sql`
5. `add_canvas_contributions.sql`
6. `add_team_decisions.sql`
7. `add_mentor_tables.sql`
8. `add_display_password_to_profiles.sql`
9. `add_admin_event_ownership.sql`

Her migration için SQL Editor'da yeni sorgu oluşturun, içeriği yapıştırın ve çalıştırın.

### Adım 4: Kimlik Doğrulama Yapılandırması

1. **Authentication** > **Providers** bölümüne gidin
2. **Email** provider'ın etkin olduğunu doğrulayın
3. **Anonymous** provider'ı etkinleştirin
4. **Save** butonuna tıklayın

### Adım 5: Storage Bucket Oluştur

1. Kenar çubuğunda **Storage**'a gidin
2. **"New bucket"** butonuna tıklayın
3. Bucket detayları:
   - **Name**: `presentations`
   - **Public bucket**: İşaretlemeyin (private kalmalı)
4. **"Create bucket"** butonuna tıklayın

5. Storage politikalarını ekleyin:
   - `presentations` bucket'ına tıklayın
   - **Policies** sekmesine gidin
   - **"New policy"** > **"For full customization"** seçin

   **Yükleme Politikası:**
   ```sql
   CREATE POLICY "Users can upload presentations"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'presentations'
     AND auth.uid() IS NOT NULL
   );
   ```

   **Okuma Politikası:**
   ```sql
   CREATE POLICY "Anyone can read presentations"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'presentations');
   ```

### Adım 6: Realtime'ı Etkinleştir

1. **Database** > **Replication** bölümüne gidin
2. `supabase_realtime` yayınını bulun
3. Bu tabloların işaretli olduğundan emin olun:
   - `events`
   - `teams`
   - `profiles`
   - `canvas_contributions`
   - `team_decisions`
   - `mentor_assignments`
   - `mentor_feedback`
4. İşaretli değillerse, yayına tıklayıp ekleyin

### Adım 7: API Kimlik Bilgilerini Al

1. **Settings** > **API** bölümüne gidin
2. Şu değerleri bulun:
   - **Project URL** (https:// ile başlar)
   - **anon public** key (uzun string)
3. Bu sekmeyi açık tutun, bu değerlere ihtiyacınız olacak

## Yerel Geliştirme

### Adım 1: Bağımlılıkları Yükle

Proje klasöründe terminal açın:

```bash
cd inovasprint
npm install
```

Bu, gerekli tüm paketleri yükler (~400 paket, 1-2 dakika sürer).

### Adım 2: Ortam Değişkenlerini Yapılandır

1. Örnek dosyayı kopyalayın:
   ```bash
   cp .env.local.example .env.local
   ```

2. `.env.local` dosyasını bir metin editöründe açın

3. Supabase kimlik bilgilerinizi doldurun:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Adım 3: Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

Şunu görmelisiniz:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

### Adım 4: Super Admin Oluştur

1. Supabase Dashboard'a gidin
2. **Authentication** > **Users** bölümüne gidin
3. **"Add user"** > **"Create new user"** seçin
4. Bilgileri girin:
   - **Email**: admin@example.com
   - **Password**: (güvenli bir şifre seçin)
5. **"Create user"** butonuna tıklayın
6. Kullanıcının UUID'sini kopyalayın (kullanıcı listesinde gösterilir)

7. **SQL Editor**'a gidin ve çalıştırın:
   ```sql
   UPDATE profiles
   SET role = 'admin', is_super_admin = true
   WHERE id = 'kullanici-uuid-buraya';
   ```

## Platformu Test Etme

### Test 1: Admin Girişi

1. [http://localhost:3000/login](http://localhost:3000/login) adresine gidin
2. Admin email ve şifresini girin
3. `/admin` sayfasına yönlendirilmelisiniz

### Test 2: Etkinlik ve Takım Oluşturma

1. Admin panelinde **Etkinlikler** sekmesine gidin
2. **"Etkinlik Oluştur"** butonuna tıklayın
3. Etkinlik adı ve dil seçin
4. **Takımlar** sekmesine gidin
5. Toplu takım oluşturma ile 10-20 takım oluşturun
6. Bir takımın QR koduna tıklayarak doğrulayın

### Test 3: Takıma Katılım (Mobil Akış)

1. QR kodundan katılım URL'sini kopyalayın
2. Gizli pencere veya farklı tarayıcıda açın
3. Ad girin ve takıma katılın
4. Öğrenci görünümünü görmelisiniz

### Test 4: Mentor ve Jüri Oluşturma

1. Admin panelinde **Mentorlar** sekmesine gidin
2. Yeni mentor oluşturun, kimlik bilgilerini kaydedin
3. Mentoru takımlara atayın
4. **Jüri** sekmesine gidin
5. Yeni jüri üyesi oluşturun

### Test 5: Etkinlik Akışı

1. Admin olarak **Etkinlik Kontrolü**'ne gidin
2. Aşamalar arasında geçiş yapın:
   - **Fikir Geliştirme** → Takımlar canvas'ı düzenleyebilir
   - **Gönderimler Kilitli** → Takımlar düzenleyemez
   - **Sunum** → Sunum Kontrolü'nden takım seçin, zamanlayıcı başlatın
   - **Oylama** → Öğrenciler oy verebilir
3. Öğrenci görünümünde her aşamayı doğrulayın

## Dağıtım

### Seçenek 1: Vercel (Önerilen)

1. Kodunuzu GitHub'a push edin
2. [vercel.com](https://vercel.com) adresine gidin
3. **"New Project"** butonuna tıklayın
4. GitHub repository'nizi import edin
5. Ortam değişkenlerini ekleyin:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (Vercel URL'nizi kullanın)
6. **"Deploy"** butonuna tıklayın

### Dağıtım Sonrası Adımlar

1. `NEXT_PUBLIC_APP_URL`'i production URL'nize güncelleyin
2. QR kod işlevselliğini test edin
3. Production admin kullanıcısı oluşturun
4. Tüm özellikleri mobil cihazlarda test edin

## Sorun Giderme

### Sorun: "Invalid API key"
- **anon** key'i kopyaladığınızdan emin olun, service_role key değil
- .env.local'da ekstra boşluk olmadığından emin olun
- Ortam değişkenlerini değiştirdikten sonra dev sunucusunu yeniden başlatın

### Sorun: QR kod ile katılım çalışmıyor
- NEXT_PUBLIC_APP_URL'in doğru olduğunu kontrol edin
- URL'in mobil cihazlardan erişilebilir olduğundan emin olun
- Yerel test için ngrok veya benzeri kullanın

### Sorun: Dosya yükleme başarısız
- `presentations` storage bucket'ının var olduğunu doğrulayın
- Storage politikalarının doğru ayarlandığını kontrol edin
- Dosyanın 50MB'ın altında olduğundan emin olun

### Sorun: Realtime güncellenmiyor
- Supabase'de Realtime'ın etkin olduğunu kontrol edin
- Tabloların replication yayınında olduğunu doğrulayın
- Tarayıcı konsolunda hata olup olmadığını kontrol edin

## Sonraki Adımlar

1. Markalaşmayı özelleştirin (renkler, logolar)
2. Etkinlik detaylarınızı ekleyin
3. Mentor ve jüri hesapları oluşturun
4. Küçük bir ekiple tam akışı test edin
5. Baskı için QR kodları hazırlayın

## Destek

Sorunlar için kontrol edin:
- Hata mesajları için tarayıcı konsolu
- Dashboard > Logs'taki Supabase logları
- Başarısız istekler için Network sekmesi

İyi hackathon'lar!
