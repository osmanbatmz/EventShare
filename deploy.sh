#!/bin/bash

# EventShare Web Deployment Script
# Bu script osmanbatmaz.com sitesine gerekli dosyaları yükler

echo "🚀 EventShare web dosyaları yükleniyor..."

# Dosyaları yükle
echo "📁 Dosyalar yükleniyor..."

# join.html dosyasını yükle
echo "📄 join.html yükleniyor..."
# Burada FTP/SCP komutları olacak
# Örnek: scp web/join.html user@osmanbatmaz.com:/var/www/osmanbatmaz.com/

# .htaccess dosyasını yükle
echo "⚙️ .htaccess yükleniyor..."
# scp web/.htaccess user@osmanbatmaz.com:/var/www/osmanbatmaz.com/

# nginx.conf dosyasını yükle (eğer Nginx kullanıyorsa)
echo "🔧 nginx.conf yükleniyor..."
# scp web/nginx.conf user@osmanbatmaz.com:/etc/nginx/sites-available/osmanbatmaz.com

echo "✅ Deployment tamamlandı!"
echo ""
echo "📋 Test etmek için:"
echo "1. QR kodunu tarayın"
echo "2. https://osmanbatmaz.com/join/BM4G4P adresini ziyaret edin"
echo "3. Etkinlik detayının görüntülendiğini kontrol edin"
echo ""
echo "🔧 Manuel yükleme için:"
echo "1. web/ klasöründeki dosyaları osmanbatmaz.com root dizinine yükleyin"
echo "2. .htaccess dosyasının çalıştığından emin olun"
echo "3. Nginx kullanıyorsanız nginx.conf'u ekleyin" 