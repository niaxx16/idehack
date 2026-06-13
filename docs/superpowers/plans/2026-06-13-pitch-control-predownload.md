# Sunum Kontrolünde Başlatmadan Önce İndirme — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin, sunum kontrol ekranında bir takımı seçince zamanlayıcıyı başlatmadan o takımın sunumunu indirebilsin.

**Architecture:** Tek dosyalık istemci değişikliği. Mevcut `downloadPresentation` fonksiyonu `currentTeam`'e sabit bağlı; bir takım parametresi alacak şekilde genelleştirilir. Takım seçici bloğuna, seçili takım için "Sunumu İndir" butonu (sunum yoksa bilgi notu) eklenir. Bir i18n anahtarı eklenir.

**Tech Stack:** Next.js 14 (client component), next-intl, Shadcn/UI Button, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-13-pitch-control-predownload-design.md`

**Doğrulama düzeni (bu repo):** Test yok. `npx next lint --file <dosya>` (yeni hata olmaması) + `npm run build`. Commit mesajları geçici dosya ile yazılır. **Doğrudan `main`'de çalış — branch/worktree AÇMA.**

---

### Task 1: i18n anahtarı

**Files:**
- Modify: `messages/tr.json` (`admin.pitchControl`, ~219-254)
- Modify: `messages/en.json` (`admin.pitchControl`, ~219-254)

- [ ] **Step 1: `messages/tr.json` → `admin.pitchControl` içine ekle**

`"downloadPresentation": "Sunumu İndir",` satırından hemen SONRA ekle:

```json
      "noPresentation": "Bu takım sunum yüklemedi",
```

- [ ] **Step 2: `messages/en.json` → `admin.pitchControl` içine ekle**

`"downloadPresentation": "Download Presentation",` satırından hemen SONRA ekle:

```json
      "noPresentation": "This team hasn't uploaded a presentation",
```

Not: Edit tool kullan (PowerShell metin işleme değil) — Türkçe UTF-8 karakterler korunsun. Virgüllere dikkat: eklenen satır mevcut bir anahtarın arasına girdiği için sonunda virgül olmalı.

- [ ] **Step 3: JSON doğrula**

Run: `node -e "require('./messages/tr.json'); require('./messages/en.json'); console.log('JSON OK')"`
Expected: `JSON OK`

- [ ] **Step 4: Commit**

```powershell
git add messages/tr.json messages/en.json
[System.IO.File]::WriteAllText("$env:TEMP\msg.txt", "Add noPresentation i18n key for pitch control`n`nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>")
git commit -F "$env:TEMP\msg.txt"
Remove-Item "$env:TEMP\msg.txt"
```

---

### Task 2: `downloadPresentation`'ı genelleştir + seçiciye buton ekle

**Files:**
- Modify: `components/admin/pitch-control.tsx`

Bağlam: `Team` tipi zaten import edili (satır 4). `Download` ikonu ve `t = useTranslations('admin.pitchControl')` mevcut. `downloadPresentation` fonksiyonu satır 376-425, içinde `currentTeam.presentation_url` ve `currentTeam.name` kullanılıyor. Aktif-sunum indirme butonu satır ~551-556. Takım seçici + başlat butonu satır ~492-517.

- [ ] **Step 1: Fonksiyon imzasını ve gövdesini genelleştir**

Şu satırı:

```tsx
  const downloadPresentation = async () => {
    if (!currentTeam?.presentation_url) return
```

şununla değiştir:

```tsx
  const downloadPresentation = async (team: Team) => {
    if (!team.presentation_url) return
```

- [ ] **Step 2: Gövdedeki `currentTeam` referanslarını `team` yap**

`downloadPresentation` gövdesinde (satır ~376-425 aralığı) kalan üç `currentTeam` kullanımını `team` ile değiştir:

1. `const response = await fetch(currentTeam.presentation_url)` → `const response = await fetch(team.presentation_url)`
2. `const urlParts = currentTeam.presentation_url.split('/')` → `const urlParts = team.presentation_url.split('/')`
3. `filename = \`${currentTeam.name}-presentation${extension}\`` → `filename = \`${team.name}-presentation${extension}\``
4. Fallback: `window.open(currentTeam.presentation_url, '_blank')` → `window.open(team.presentation_url, '_blank')`

Doğrulama: Değişiklik sonrası `downloadPresentation` gövdesinde HİÇ `currentTeam` kalmamalı. (Kontrol: bu fonksiyonun içinde `currentTeam` aratıldığında sonuç çıkmamalı.)

Not: `team.presentation_url` ilk satırda null-guard'landığı için TypeScript dar daraltma (narrowing) ile `string` kabul eder; ancak fonksiyon içindeki `await`/closure sonrası daralma kaybolabilir. Eğer build `team.presentation_url` olası null hatası verirse, fetch ve split kullanımlarında `team.presentation_url!` (non-null assertion) kullan — fonksiyonun ilk satırı zaten null dönüşü garanti ediyor.

- [ ] **Step 3: Aktif-sunum butonunun çağrısını güncelle**

Aktif sunum bloğundaki mevcut butonu:

```tsx
                {currentTeam.presentation_url && (
                  <Button onClick={downloadPresentation} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t('downloadPresentation')}
                  </Button>
                )}
```

şununla değiştir (yalnızca `onClick` değişir):

```tsx
                {currentTeam.presentation_url && (
                  <Button onClick={() => downloadPresentation(currentTeam)} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t('downloadPresentation')}
                  </Button>
                )}
```

- [ ] **Step 4: Seçiciye indirme butonu / not ekle**

Takım seçici bloğundaki "Sunum Zamanlayıcısını Başlat" butonunu içeren parçayı bul:

```tsx
              <Button
                onClick={startPitch}
                disabled={!selectedTeamId || isStarting}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                {t('startPitch')}
              </Button>
            </div>
```

şununla değiştir (başlat butonundan ÖNCE indirme butonu/not eklenir):

```tsx
              {selectedTeamId && (() => {
                const selected = teams.find((tm) => tm.id === selectedTeamId)
                if (!selected) return null
                return selected.presentation_url ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => downloadPresentation(selected)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t('downloadPresentation')}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    {t('noPresentation')}
                  </p>
                )
              })()}

              <Button
                onClick={startPitch}
                disabled={!selectedTeamId || isStarting}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                {t('startPitch')}
              </Button>
            </div>
```

- [ ] **Step 5: Lint + build**

Run: `npx next lint --file components/admin/pitch-control.tsx`
Expected: Bu dosya için yeni hata yok (mevcut eski uyarılar bilinen durum: ExternalLink unused, no-explicit-any 217/249/250, exhaustive-deps).
Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 6: Commit**

```powershell
git add components/admin/pitch-control.tsx
[System.IO.File]::WriteAllText("$env:TEMP\msg.txt", "Allow downloading a team's presentation before starting the pitch`n`nGeneralize downloadPresentation to take a team, and show a download`nbutton (or a no-presentation note) for the selected team in the pitch`ncontrol selector.`n`nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>")
git commit -F "$env:TEMP\msg.txt"
Remove-Item "$env:TEMP\msg.txt"
```

---

### Task 3: Canlı doğrulama + push

**Files:** (kod değişikliği yok)

- [ ] **Step 1: Senaryo testi**

PITCHING durumundaki bir etkinlikte, admin "Sunum Kontrolü" sekmesinde:
1. Dropdown'dan sunumu olan bir takım seçilir → "Sunumu İndir" butonu çıkar, tıklanınca dosya iner (zamanlayıcı başlamadan).
2. Sunumu olmayan bir takım seçilir → "Bu takım sunum yüklemedi" notu görünür, indirme butonu yok.
3. Sunum başlatılınca aktif sunum bloğundaki indirme butonu hâlâ çalışır.

- [ ] **Step 2: Push (kullanıcı onayıyla)**

```powershell
git push origin main
```

---

## Self-review notları

- Spec → görev eşlemesi: i18n `noPresentation` (Task 1); fonksiyon genelleştirme + aktif buton çağrısı + seçici butonu/notu (Task 2); canlı doğrulama (Task 3). Boşluk yok.
- Tip tutarlılığı: `downloadPresentation(team: Team)` — hem `currentTeam` (Team) hem `selected` (teams.find sonucu, null-guard'lı Team) ile çağrılır. `Team` zaten import edili.
- Yeni i18n anahtarı `noPresentation` hem tr hem en'de; `downloadPresentation` mevcut anahtarı yeniden kullanılır.
- `main`'de çalış; branch/worktree açma.
