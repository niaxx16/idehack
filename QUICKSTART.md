# Hızlı Başlangıç Kılavuzu - InovaSprint

Geliştirme sunucunuz çalışıyor! Her şeyin çalışması için bu adımları izleyin.

## Tamamlandı
- Ortam değişkenleri yapılandırıldı
- Geliştirme sunucusu http://localhost:3000 adresinde çalışıyor
- Bağımlılıklar yüklendi

## Gerekli Adımlar

### Adım 1: Veritabanı Kurulumu (5 dakika)

1. **Supabase Dashboard**'unuzu açın

2. Sol kenar çubuğunda **SQL Editor**'a gidin

3. **"New query"** butonuna tıklayın

4. `supabase/schema.sql` içeriğini kopyalayıp editöre yapıştırın

5. **"Run"** butonuna tıklayın (veya Ctrl/Cmd + Enter)

6. "Success. No rows returned" mesajını görmelisiniz

7. `supabase/migrations/` klasöründeki tüm dosyaları sırayla çalıştırın

### Adım 2: Anonim Kimlik Doğrulamayı Etkinleştir

1. Supabase Dashboard'da **Authentication** → **Providers**'a gidin

2. Aşağı kaydırıp **Anonymous** provider'ı bulun

3. **ON** durumuna getirin

4. **Save** butonuna tıklayın

Bu, öğrencilerin hesap oluşturmadan takımlara katılmasını sağlar.

### Adım 3: Sunumlar için Storage Bucket Oluştur

1. Kenar çubuğunda **Storage**'a gidin

2. **"New bucket"** butonuna tıklayın

3. Adını `presentations` yapın

4. **Private** tutun ("Public bucket" işaretlemeyin)

5. **"Create bucket"** butonuna tıklayın

6. `presentations` bucket'ına tıklayın

7. **Policies** sekmesine gidin → **"New policy"** → **"For full customization"**

8. Bu SQL'i yapıştırın:
   ```sql
   CREATE POLICY "Users can upload presentations"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'presentations'
     AND auth.uid() IS NOT NULL
   );
   ```

9. Okuma için başka bir politika ekleyin:
   ```sql
   CREATE POLICY "Anyone can read presentations"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'presentations');
   ```

### Adım 4: İlk Super Admin Kullanıcınızı Oluşturun

1. Supabase Dashboard'da **Authentication** → **Users**'a gidin

2. **"Add user"** → **"Create new user"** seçin

3. Doldurun:
   - **Email**: `admin@example.com` (veya kendi email'iniz)
   - **Password**: Güvenli bir şifre seçin (min 6 karakter)

4. **"Create user"** butonuna tıklayın

5. Kullanıcı listesinden **User UID**'yi kopyalayın (uzun UUID string)

6. **SQL Editor**'a geri dönün

7. Bu SQL'i çalıştırın (kullanıcı ID'nizi yapıştırın):
   ```sql
   UPDATE profiles
   SET role = 'admin', is_super_admin = true
   WHERE id = 'kullanici-id-buraya';
   ```

### Adım 5: Realtime'ı Etkinleştir (Önerilen)

1. Kenar çubuğunda **Database** → **Replication**'a gidin

2. `supabase_realtime` yayınını bulun

3. Bu tabloların işaretli olduğundan emin olun:
   - events
   - teams
   - profiles
   - canvas_contributions
   - team_decisions
   - mentor_assignments
   - mentor_feedback

4. İşaretli değilse, yayına tıklayıp ekleyin

## Test Etmeye Hazır!

Şimdi ziyaret edin: **http://localhost:3000**

### Admin Akışını Test Edin:

1. **"Admin / Jüri Girişi"** butonuna tıklayın
2. Admin kimlik bilgilerinizi girin
3. `/admin` sayfasına yönlendirileceksiniz
4. **Etkinlikler** sekmesine gidin:
   - **"Etkinlik Oluştur"** butonuna tıklayın
   - Etkinlik adı girin (ör. "Test Hackathon")
   - Dil seçin (Türkçe veya İngilizce)
   - **"Oluştur"** butonuna tıklayın
5. **Takımlar** sekmesine gidin:
   - **"Toplu Takım Oluştur"** butonuna tıklayın
   - Ön ek girin (ör. "Takım")
   - Takım sayısı girin (ör. 10)
   - **"Oluştur"** butonuna tıklayın
6. Bir takımın **"QR Kodu"** butonuna tıklayarak katılım linkini görün

### Öğrenci Akışını Test Edin:

1. QR kod diyalogundan katılım URL'sini kopyalayın
2. Gizli pencerede (veya farklı tarayıcıda) açın
3. Adınızı girin
4. **"Takıma Katıl"** butonuna tıklayın
5. Öğrenci görünümünü göreceksiniz

### Etkinlik Aşamalarını Test Edin:

1. Admin olarak **Etkinlik Kontrolü**'ne gidin
2. Aşamalar arasında geçiş yapın:
   - **Fikir Geliştirme Başlat** → Takımlar canvas'ı düzenleyebilir
   - **Gönderimler Kilitle** → Takımlar artık düzenleyemez
   - **Sunum Başlat** → Sunum Kontrolü'ne gidin, takım seçin, zamanlayıcı başlatın
   - **Oylama Başlat** → Öğrenciler şimdi oy verebilir
   - **Etkinlik Tamamla** → Sıralamayı görüntüleyin

## Mobil Test

1. Bilgisayarınızın yerel IP adresini bulun:
   - Windows: `ipconfig` (IPv4 arayın)
   - Mac/Linux: `ifconfig` veya `ip addr`

2. `.env.local` dosyasını güncelleyin:
   ```env
   NEXT_PUBLIC_APP_URL=http://IP-ADRESINIZ:3000
   ```

3. Dev sunucusunu yeniden başlatın (Ctrl+C, sonra `npm run dev`)

4. Mobil cihazınızda (aynı WiFi): `http://IP-ADRESINIZ:3000` adresini ziyaret edin

5. Katılım akışını test etmek için QR kodu tarayın!

## Sorun Giderme

### "Invalid API key" hatası
- `.env.local` içindeki kimlik bilgilerini kontrol edin
- **anon** key'i kopyaladığınızdan emin olun (service_role değil)
- Ortam değişkenlerini değiştirdikten sonra dev sunucusunu yeniden başlatın

### Veritabanı tabloları yok
- SQL şemasını tekrar çalıştırın
- SQL Editor'da hata olup olmadığını kontrol edin
- Tüm SQL ifadelerinin başarıyla tamamlandığından emin olun

### QR kod ile takıma katılamıyorum
- Anonymous auth'un etkin olduğunu kontrol edin
- Katılım URL'sinin doğru domain'e sahip olduğunu doğrulayın
- Tarayıcı konsolunda hata olup olmadığını kontrol edin

### Dosya yükleme başarısız
- `presentations` storage bucket'ının var olduğundan emin olun
- Storage politikalarının ayarlandığını doğrulayın
- Dosyanın 50MB'ın altında olduğunu kontrol edin

## Sırada Ne Var?

- Tam özellik listesi için `README.md` okuyun
- Detaylı açıklamalar için `SETUP_GUIDE.md` inceleyin
- Kod yapısını keşfedin
- Renkleri ve markalaşmayı özelleştirin
- Arkadaşlarla tam etkinlik akışını test edin

## Hızlı Referans

| Sayfa | URL |
|-------|-----|
| Ana Sayfa | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| Takım Görünümü | http://localhost:3000/team |
| Öğrenci Görünümü | http://localhost:3000/student |
| Jüri Görünümü | http://localhost:3000/jury |
| Mentor Görünümü | http://localhost:3000/mentor |
| Giriş | http://localhost:3000/login |
| Takıma Katıl | http://localhost:3000/join |
| Tekrar Katıl | http://localhost:3000/rejoin |

---

Yardıma mı ihtiyacınız var? `README.md` ve `SETUP_GUIDE.md` dosyalarındaki sorun giderme bölümlerini kontrol edin!
