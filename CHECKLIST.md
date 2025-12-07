# Kurulum Kontrol Listesi - InovaSprint

Kurulum ilerlemenizi takip etmek için bu kontrol listesini kullanın.

## Geliştirme Ortamı
- [x] Next.js 14 projesi oluşturuldu
- [x] Bağımlılıklar yüklendi
- [x] Ortam değişkenleri yapılandırıldı
- [x] Geliştirme sunucusu http://localhost:3000 adresinde çalışıyor

## Supabase Yapılandırması

### Veritabanı Kurulumu
- [ ] `supabase/schema.sql` dosyası SQL Editor'da çalıştırıldı
- [ ] Tüm tablolar oluşturuldu:
  - [ ] events
  - [ ] teams
  - [ ] profiles
  - [ ] user_notes
  - [ ] transactions
  - [ ] jury_scores
- [ ] Migration dosyaları çalıştırıldı:
  - [ ] add_full_name_to_profiles.sql
  - [ ] add_event_to_profiles.sql
  - [ ] add_event_language.sql
  - [ ] add_admin_expiration.sql
  - [ ] add_canvas_contributions.sql
  - [ ] add_team_decisions.sql
  - [ ] add_mentor_tables.sql
  - [ ] add_display_password_to_profiles.sql
  - [ ] add_admin_event_ownership.sql
- [ ] RPC fonksiyonları mevcut (join_team_by_token, submit_portfolio, get_leaderboard)

### Kimlik Doğrulama
- [ ] Email provider etkin
- [ ] Anonymous provider etkin (Auth > Providers)
- [ ] Kimlik doğrulama ayarları kaydedildi

### Storage
- [ ] `presentations` bucket oluşturuldu (Private)
- [ ] Kimlik doğrulamalı kullanıcılar için yükleme politikası eklendi
- [ ] Tüm kullanıcılar için okuma politikası eklendi

### Realtime
- [ ] Bu tablolar için Realtime replication etkin:
  - [ ] events
  - [ ] teams
  - [ ] profiles
  - [ ] canvas_contributions
  - [ ] team_decisions
  - [ ] mentor_assignments
  - [ ] mentor_feedback

## Kullanıcı Kurulumu
- [ ] Authentication > Users'da ilk admin kullanıcısı oluşturuldu
- [ ] Kullanıcının UUID'si kopyalandı
- [ ] role = 'admin' ve is_super_admin = true ayarlamak için UPDATE sorgusu çalıştırıldı
- [ ] (İsteğe bağlı) Test için ek admin kullanıcıları oluşturuldu

## Test

### Temel İşlevsellik
- [ ] http://localhost:3000 ziyaret edildi
- [ ] Giriş sayfası düzgün yükleniyor
- [ ] Admin kimlik bilgileriyle giriş yapılabiliyor

### Admin Özellikleri
- [ ] Etkinlik oluşturuldu (dil seçimi ile)
- [ ] Takımlar toplu oluşturuldu
- [ ] QR kodu görüntülendi
- [ ] Mentor oluşturuldu ve takımlara atandı
- [ ] Jüri üyesi oluşturuldu
- [ ] Etkinlik aşamaları değiştirildi (WAITING → IDEATION → LOCKED → PITCHING → VOTING → COMPLETED)
- [ ] Sunum için takım seçildi
- [ ] Sunum zamanlayıcısı başlatıldı
- [ ] Sıralama görüntülendi

### Takım Özellikleri
- [ ] /team sayfasına gidildi
- [ ] Canvas formu dolduruldu
- [ ] Sunum dosyası yüklendi (PDF/PPT)
- [ ] Takım QR kodu görüntülendi
- [ ] LOCKED/PITCHING aşamalarında form kilitleniyor

### Öğrenci Özellikleri
- [ ] QR kod ile takıma katılım
- [ ] Öğrenci görünümünde sunum izleme
- [ ] Özel not alma
- [ ] Hype reaksiyonları gönderme (Alkış/Ateş)
- [ ] VOTING aşamasında oylama
- [ ] Portföy yatırımları gönderme

### Mentor Özellikleri
- [ ] Mentor olarak giriş yapıldı
- [ ] Atanan takımlar görüntülendi
- [ ] Takım canvas'ı incelendi
- [ ] Canvas bölümüne geri bildirim verildi

### Jüri Özellikleri
- [ ] Jüri kullanıcısı olarak giriş yapıldı
- [ ] Bölünmüş ekran dashboard görüntülendi
- [ ] Stream URL'den yayın izlendi
- [ ] Takım 4 kriterde puanlandı
- [ ] Yorum eklendi
- [ ] Mevcut puan güncellendi

## Mobil Test (İsteğe Bağlı)
- [ ] Yerel IP adresi bulundu
- [ ] .env.local'da NEXT_PUBLIC_APP_URL güncellendi
- [ ] Dev sunucusu yeniden başlatıldı
- [ ] Mobil cihazda QR kod tarama testi yapıldı
- [ ] Mobil cihazda öğrenci görünümü testi yapıldı
- [ ] Mobil cihazda hype reaksiyonları testi yapıldı

## Özelleştirme (İsteğe Bağlı)
- [ ] Uygulama adı/markası güncellendi
- [ ] globals.css'de renk şeması özelleştirildi
- [ ] Logo görselleri eklendi
- [ ] PWA ikonları güncellendi (icon-192.png, icon-512.png)
- [ ] Supabase'de email şablonları özelleştirildi

## Production Dağıtımı (Gelecek)
- [ ] Kod GitHub'a push edildi
- [ ] Vercel/Netlify'a dağıtıldı
- [ ] NEXT_PUBLIC_APP_URL production domain'e güncellendi
- [ ] Production dağıtımı test edildi
- [ ] Production admin kullanıcıları oluşturuldu
- [ ] Production'da tüm özellikler test edildi

## Etkinlik Günü Hazırlığı
- [ ] Tüm takımlar önceden oluşturuldu
- [ ] Her masa için QR kodları basıldı
- [ ] Jüri hesapları oluşturuldu
- [ ] Mentor hesapları oluşturuldu ve takımlara atandı
- [ ] Stream URL ayarlandı
- [ ] Tam akış uçtan uca test edildi
- [ ] Yedek plan hazırlandı (dışa aktarılan veriler, ekran görüntüleri)
- [ ] Takım kaptanlarına masaüstü görünümü anlatıldı
- [ ] Öğrencilere mobil akış anlatıldı
- [ ] Jüriye uzaktan puanlama anlatıldı
- [ ] Mentörlere geri bildirim sistemi anlatıldı

## Dokümantasyon İncelemesi
- [ ] README.md okundu
- [ ] SETUP_GUIDE.md incelendi
- [ ] QUICKSTART.md takip edildi
- [ ] schema.sql'deki veritabanı şeması anlaşıldı

---

## Mevcut Durum: Geliştirme Ortamı Hazır

**Sonraki adım**: `supabase/schema.sql` çalıştırarak Supabase veritabanını kurun

Adım adım talimatlar için `QUICKSTART.md` dosyasına bakın!
