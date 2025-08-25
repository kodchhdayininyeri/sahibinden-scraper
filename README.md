# Sahibinden Araç Veri Toplama ve Analiz Platformu

Sahibinden.com'dan araç ilanlarını toplayan ve analiz eden full-stack web uygulaması.

## Proje Özeti

Bu proje, Sahibinden.com'daki araç ilanlarını otomatik olarak toplar, PostgreSQL veritabanında saklar ve kullanıcıların bu verileri filtreleyerek incelemesini sağlar.

## Teknik Altyapı

### Veri Toplama Sistemi

**Anti-Bot Çözümü:**
- **SeleniumBase (uc=True)**: Undetected Chrome modu ile bot tespitini bypass eder
- **Mobil Proxy Rotasyonu**: SOAX (Turkcell/Vodafone) ve NodeMaven proxy servisleri
- **Paralel Çalışma**: 2 bilgisayarda toplam 5 scraper instance'ı

### Veritabanı
- PostgreSQL (8,865+ araç kaydı)
- Indexlenmiş sorgular için optimize edilmiş tablolar

### Web Uygulaması
- **Frontend**: HTML, Tailwind CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js REST API
- **Hosting**: Render.com (Production)

## Özellikler

### Web Uygulaması
- **Gelişmiş Filtreleme**: Cascade dropdown'lar ile marka → seri → model seçimi
- **Aralık Filtreleri**: Fiyat, yıl, KM aralığı belirleme
- **Dinamik Şehir Filtresi**: Aktif filtrelere göre şehir listesi güncelleme
- **Real-time İstatistikler**: Ortalama fiyat, hasarsız araç sayısı
- **Pagination & Sorting**: Büyük veri setlerinde performanslı gezinme
- **URL-based Routing**: Paylaşılabilir filtre URL'leri

### Veri Detayları
- **Hasar Analizi**: Boyalı/değişen parça sayıları, toplam hasar alanları
- **Özellik Sayıları**: Güvenlik, iç/dış donanım, multimedya özellik skorları
- **JSON Depolama**: Detaylı araç özellikleri, hasar haritaları
- **Meta Bilgiler**: İlan tarihi, scraping zamanı, proxy türü

## Kurulum

### Backend
```bash
cd backend
npm install
node server.js
```

### Scraper (PC1)
```bash
pip install -r requirements.txt
python scraping/pc1_scraping/sb_audi_auto_restart_clean.py
```

### Çevre Değişkenleri
`.env.example` dosyasını `.env` olarak kopyalayın ve gerekli bilgileri doldurun:
- Veritabanı bağlantı bilgileri
- Proxy kullanıcı adı ve şifreleri

## Klasör Yapısı

```
/backend              - Express.js API sunucusu
/scraping
  /pc1_scraping      - PC1 scraper dosyaları (3 instance)
  /pc2_scraping      - PC2 scraper dosyaları (2 instance)
  /extensions        - Chrome eklentileri
car-analyzer-table.html - Frontend arayüzü
```

## Teknik Detaylar

### Anti-Bot Sistemi
- **SeleniumBase uc=True**: Ana anti-detection çözümü, undetected Chrome modu
- **Mobil Proxy Rotasyonu**: SOAX ve NodeMaven servisleri ile IP çeşitliliği
- **Cookie Temizleme**: Bot tespiti durumunda devreye giren yardımcı sistem

### Scraping Mimarisi
- 2 PC'de paralel çalışan 5 scraper instance'ı
- Her instance farklı proxy kullanarak dağıtık veri toplama
- Otomatik yeniden başlatma ile kesintisiz operasyon

### Performans
- Saatte ~200 araç verisi toplama kapasitesi
- %85+ başarı oranı bot korumasına rağmen
- Ortalama sorgu yanıt süresi <100ms (web uygulaması)

## Canlı Demo
https://ozsahibinden-backend.onrender.com

## Sistem Mimarisi
- **PC1**: 3 scraper (SOAX + NodeMaven proxy)
- **PC2**: 2 scraper (SOAX + NodeMaven proxy)
- **PostgreSQL**: Merkezi veri depolama
- **Web App**: Express.js + PostgreSQL + Tailwind
