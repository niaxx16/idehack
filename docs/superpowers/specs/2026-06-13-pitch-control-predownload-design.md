# Sunum Kontrolünde Başlatmadan Önce Sunum İndirme

**Tarih:** 2026-06-13
**Kapsam:** `components/admin/pitch-control.tsx`, i18n (tr+en)

## Amaç

Admin, sunum kontrol ekranında bir takımı seçtikten **sonra ama zamanlayıcıyı başlatmadan önce** o takımın sunum dosyasını indirebilsin. Şu an indirme butonu yalnızca sunum başladıktan sonra (`currentTeam`) görünüyor; admin sunumu önceden indirip ekrana yansıtmak için takımlar sayfasına gidip dönmek zorunda kalıyor.

## Mevcut Durum

`pitch-control.tsx`:
- `downloadPresentation` fonksiyonu `currentTeam.presentation_url`'a sabit bağlı; dosyayı fetch edip blob olarak indiriyor, hata olursa yeni sekmede açmaya düşüyor.
- İndirme butonu yalnızca aktif sunum bloğunda (`currentTeam` varken) ve `currentTeam.presentation_url` doluysa render ediliyor.
- Takım seçici bloğu (aktif sunum yokken, `event.status === 'PITCHING'`): dropdown (`selectedTeamId`) + "Sunum Zamanlayıcısını Başlat" butonu. Burada indirme yok.
- `teams` prop'undaki her takımda `presentation_url` alanı mevcut (`currentTeam` zaten buradan türetiliyor).

## Tasarım

### 1. `downloadPresentation`'ı genelleştir

Fonksiyon imzası, sabit `currentTeam` yerine bir takım nesnesi alacak şekilde değişir:

```ts
const downloadPresentation = async (team: { name: string; presentation_url: string | null }) => {
  if (!team.presentation_url) return
  // ... mevcut fetch/blob/indir mantığı; currentTeam.presentation_url → team.presentation_url,
  //     currentTeam.name → team.name
}
```

Mevcut aktif-sunum butonu artık `onClick={() => downloadPresentation(currentTeam)}` ile çağırır (davranış birebir korunur).

### 2. Seçiciye indirme butonu / not ekle

Takım seçici bloğunda, "Sunum Zamanlayıcısını Başlat" butonunun hemen yanına/altına şu eklenir (sadece `selectedTeamId` doluyken):

```tsx
{selectedTeamId && (() => {
  const selected = teams.find((tm) => tm.id === selectedTeamId)
  if (!selected) return null
  return selected.presentation_url ? (
    <Button variant="outline" className="w-full" onClick={() => downloadPresentation(selected)}>
      <Download className="mr-2 h-4 w-4" />
      {t('downloadPresentation')}
    </Button>
  ) : (
    <p className="text-sm text-muted-foreground text-center">{t('noPresentation')}</p>
  )
})()}
```

(`Download` ikonu ve `t = useTranslations('admin.pitchControl')` zaten mevcut.)

### 3. i18n

`admin.pitchControl` altına yeni anahtar:
- `noPresentation` — tr: "Bu takım sunum yüklemedi" / en: "This team hasn't uploaded a presentation"

Mevcut `downloadPresentation` anahtarı yeniden kullanılır.

## Kapsam Dışı

- Tarayıcıda önizleme / yeni sekmede açma (kullanıcı yalnızca indirme istedi).
- Sunum dosyası yükleme/yönetimi.
- Aktif sunum akışında veya zamanlayıcı mantığında değişiklik.
- Realtime / veri modeli değişikliği (yok).

## Doğrulama

1. `npx next lint --file components/admin/pitch-control.tsx` (yeni hata yok) + `npm run build`.
2. Canlı test: PITCHING durumundaki bir etkinlikte sunum kontrol ekranında bir takım seçilir → sunumu olan takımda "Sunumu İndir" butonu çıkar ve dosyayı indirir; sunumu olmayan takımda "Bu takım sunum yüklemedi" notu görünür; başlatmadan indirme yapılabildiği doğrulanır.
