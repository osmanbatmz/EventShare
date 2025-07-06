# EventShare Web Deployment

Bu dosyalar `osmanbatmaz.com` sitesinde kullanılacak olan EventShare web sayfalarını içerir.

## Dosyalar

- `index.html` - Ana sayfa
- `join.html` - QR kodundan gelen `/join/{event_code}` sayfası
- `.htaccess` - Apache sunucu için URL yönlendirme
- `nginx.conf` - Nginx sunucu için konfigürasyon
- `manifest.json` - PWA manifest dosyası

## Deployment Adımları

### 1. Dosyaları Yükle
Tüm dosyaları `osmanbatmaz.com` sitesinin root dizinine yükleyin.

### 2. Sunucu Konfigürasyonu

#### Apache için:
- `.htaccess` dosyası otomatik olarak çalışacak
- Mod_rewrite modülünün aktif olduğundan emin olun

#### Nginx için:
- `nginx.conf` dosyasındaki konfigürasyonu sunucunuza ekleyin
- Nginx'i yeniden başlatın: `sudo systemctl reload nginx`

### 3. Test Etme

QR kodunu test etmek için:
1. Bir etkinlik oluşturun
2. QR kodunu tarayın
3. `https://osmanbatmaz.com/join/{event_code}` adresine yönlendirildiğini kontrol edin

## URL Yapısı

- `https://osmanbatmaz.com/` - Ana sayfa
- `https://osmanbatmaz.com/join/{event_code}` - Etkinlik detay sayfası

## Özellikler

- ✅ QR kodundan gelen event_code ile etkinlik detayını gösterir
- ✅ Supabase'den gerçek zamanlı veri çeker
- ✅ Responsive tasarım (mobil uyumlu)
- ✅ Deep link desteği (`eventshare://join/{event_code}`)
- ✅ Uygulama indirme linkleri
- ✅ Hata yönetimi

## Gereksinimler

- Apache veya Nginx web sunucusu
- Mod_rewrite (Apache için)
- SSL sertifikası (önerilen)

## Notlar

- Supabase anahtarı `join.html` dosyasında güncel tutulmalı
- Uygulama store linkleri gerçek linklerle değiştirilmeli
- Favicon ve logo dosyaları eklenmeli 