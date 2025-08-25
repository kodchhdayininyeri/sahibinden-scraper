# Sahibinden Car Scraper

Sahibinden.com'dan araç verilerini çeken ve analiz eden full‑stack proje.

## Ne Yaptım

Sahibinden.com'dan araç ilanlarını otomatik çeken bir sistem geliştirdim. Sitenin bot korumasını aşmak için mobil proxy'ler ve özel bir Chrome extension kullandım. Topladığım verileri PostgreSQL'de sakladım ve filtreleme yapabilen bir web arayüzü oluşturdum.

**Canlı Site:** [https://ozsahibinden-backend.onrender.com](https://ozsahibinden-backend.onrender.com)
**Toplanan Veri:** 8.865 araç kaydı

## Nasıl Çalışıyor

### 1. URL Toplama

`scraping/sahibinden_url_extractor` – Chrome extension ile listing sayfalarından araç URL'lerini toplar.

### 2. Veri Çekme

2 bilgisayarda toplam 5 scraper paralel çalışıyor:

* **PC1:** 3 scraper (SOAX Vodafone + NodeMaven proxy)
* **PC2:** 2 scraper (SOAX Turkcell + NodeMaven proxy)

Her scraper farklı proxy kullanarak IP banından kaçınıyor.

### 3. Bot Koruması Atlatma

* Mobil proxy'lerle gerçek telefon IP'leri kullanma
* Cookie temizleme extension'ı (Cloudflare bypass)
* User‑Agent rotasyonu
* Rastgele gecikmeler (random delay)

### 4. Web Arayüzü

Çekilen verileri görüntülemek için:

* Marka, model, yıl, fiyat, şehir, KM filtreleri
* Responsive tablo
* Real‑time arama

## Kurulum

### Backend API

```bash
cd backend
npm install
# .env dosyasına PostgreSQL bilgilerini gir
node server.js
```

### Scraping'i Başlatma

```bash
pip install -r requirements.txt

# Proxy bilgilerini dosyalara gir:
# SOAX: YOUR_SOAX_USERNAME:YOUR_SOAX_PASSWORD
# NodeMaven: YOUR_NODEMAVEN_USERNAME:YOUR_NODEMAVEN_PASSWORD

# PC1'de çalıştır:
python scraping/pc1_scraping/sb_audi_auto_restart_clean.py
python scraping/pc1_scraping/sb_vodafone_fixed.py
python scraping/pc1_scraping/sb_nodemaven_vodafone.py

# PC2'de çalıştır:
python scraping/pc2_scraping/sb_turkcell_updated.py
python scraping/pc2_scraping/sb_nodemaven_2.py
```

### Database

PostgreSQL'de `sahibinden_cars` database oluştur. Tablolar otomatik oluşacak.

## Teknik Detaylar

**Scraping**

* SeleniumBase (undetected Chrome)
* SOAX mobil proxy (Turkcell/Vodafone IP)
* NodeMaven rotating proxy
* 5 paralel instance

**Backend**

* Node.js + Express.js
* PostgreSQL database
* REST API

**Frontend**

* HTML + Tailwind CSS
* Vanilla JavaScript
* Dinamik filtreleme

## Karşılaşılan Zorluklar

1. Cloudflare koruması → Mobil proxy + cookie temizleme ile çözüldü
2. Rate limiting → Paralel scraper'lar ve gecikmeler
3. Bot tespiti → Extension ile cookie yönetimi
4. Veri tutarlılığı → Try‑catch ve fallback parsing

## Dosya Yapısı

```
backend/                     → Express API server
scraping/
  pc1_scraping/             → PC1 scraper'ları (3 adet)
  pc2_scraping/             → PC2 scraper'ları (2 adet)
  sahibinden_url_extractor/ → URL toplama extension'ı
car-analyzer-table.html      → Frontend arayüz
```

## Notlar

* Proxy'ler ücretli (SOAX ve NodeMaven)
* Bot tespiti nedeniyle %100 başarı oranı yok (\~%85)
* Ücretsiz Render hosting bazen yavaş olabiliyor
* Database'de 8.865 araç var (bütçe limitinden dolayı)
