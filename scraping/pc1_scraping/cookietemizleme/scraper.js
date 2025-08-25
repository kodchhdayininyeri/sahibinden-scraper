// Sahibinden.com Scraper with Cookie Cleaning Integration
// Bu dosya extension içinde çalışır

class SahibindenScraper {
  constructor() {
    this.isScrapingActive = false;
    this.results = [];
    this.currentUrl = '';
  }

  // Sayfa yüklendiğinde otomatik scraping başlat
  async autoScrapeAfterCookieClean() {
    try {
      // Cookie temizleme tamamlandıktan 2 saniye sonra scraping başlat
      setTimeout(async () => {
        if (window.location.href.includes('sahibinden.com') && 
            window.location.href.includes('/ilan/')) {
          console.log('🤖 Auto-scraping başlatılıyor...');
          await this.scrapePage();
        }
      }, 2000);
    } catch (error) {
      console.error('Auto-scraping error:', error);
    }
  }

  // Ana scraping fonksiyonu
  async scrapePage() {
    if (this.isScrapingActive) {
      console.log('Scraping zaten aktif');
      return;
    }

    this.isScrapingActive = true;
    this.currentUrl = window.location.href;
    
    console.log('🔍 Scraping başladı:', this.currentUrl);
    
    try {
      const result = {
        url: this.currentUrl,
        timestamp: new Date().toISOString(),
        success: false,
        data: {}
      };

      // Title çıkarma
      const title = this.extractTitle();
      if (title) result.data.title = title;

      // Price çıkarma
      const price = this.extractPrice();
      if (price) result.data.price = price;

      // Location çıkarma
      const location = this.extractLocation();
      if (location) result.data.location = location;

      // Specs çıkarma
      const specs = this.extractSpecs();
      if (specs) result.data.specs = specs;

      // Features çıkarma
      const features = this.extractFeatures();
      if (features) result.data.features = features;

      // Paint/Damage çıkarma
      const paintDamage = this.extractPaintDamage();
      if (paintDamage) result.data.paintDamage = paintDamage;

      // Success kontrolü
      if (Object.keys(result.data).length > 0) {
        result.success = true;
        console.log('✅ Scraping başarılı:', result.data.title || 'Başlık bulunamadı');
      }

      this.results.push(result);
      
      // Background script'e sonucu gönder
      chrome.runtime.sendMessage({
        action: 'scrapingResult',
        result: result
      });

      return result;

    } catch (error) {
      console.error('Scraping error:', error);
      const errorResult = {
        url: this.currentUrl,
        success: false,
        error: error.message
      };
      
      chrome.runtime.sendMessage({
        action: 'scrapingResult',
        result: errorResult
      });
      
      return errorResult;
    } finally {
      this.isScrapingActive = false;
    }
  }

  // Title çıkarma
  extractTitle() {
    try {
      const selectors = [
        '.classifiedDetailTitle h1',
        'h1.classifiedDetailTitle',
        '.classifiedDetailTitle',
        'h1'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim() && 
            !element.textContent.toLowerCase().includes('sahibinden')) {
          return element.textContent.trim();
        }
      }

      // Fallback: sayfa başlığından çıkar
      const pageTitle = document.title;
      if (pageTitle && !pageTitle.toLowerCase().includes('sahibinden')) {
        return pageTitle.trim();
      }

      return null;
    } catch (error) {
      console.error('Title extraction error:', error);
      return null;
    }
  }

  // Price çıkarma
  extractPrice() {
    try {
      const selectors = [
        '.classified-price-wrapper',
        '.classifiedInfo .price',
        '[class*="price"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const priceText = element.textContent.trim();
          if (/\d/.test(priceText)) {
            return priceText;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Price extraction error:', error);
      return null;
    }
  }

  // Location çıkarma
  extractLocation() {
    try {
      const breadcrumbs = document.querySelectorAll('.classifiedInfo h2 a');
      const locations = [];

      breadcrumbs.forEach(link => {
        const locationText = link.textContent.trim();
        if (locationText && locationText !== '/') {
          locations.push(locationText);
        }
      });

      if (locations.length > 0) {
        return {
          city: locations[0] || null,
          district: locations[1] || null,
          neighborhood: locations[2] || null,
          fullAddress: locations.join(' / ')
        };
      }

      return null;
    } catch (error) {
      console.error('Location extraction error:', error);
      return null;
    }
  }

  // Specs çıkarma (pageTrackData'dan)
  extractSpecs() {
    try {
      if (typeof pageTrackData !== 'undefined' && pageTrackData) {
        const customVars = pageTrackData.customVars || [];
        const specs = {};

        const carSpecKeys = [
          'Marka', 'Seri', 'Model', 'Yıl', 'Yakıt Tipi', 'Vites',
          'KM', 'Motor Gücü', 'Motor Hacmi', 'Renk', 'Kimden',
          'Takas', 'Kasa Tipi', 'Çekiş', 'Garanti', 'Ağır Hasar Kayıtlı',
          'Plaka / Uyruk', 'İlan Tarihi'
        ];

        customVars.forEach(variable => {
          if (variable.name && variable.value && 
              carSpecKeys.includes(variable.name)) {
            specs[variable.name] = String(variable.value).trim();
          }
        });

        return Object.keys(specs).length > 0 ? specs : null;
      }

      return null;
    } catch (error) {
      console.error('Specs extraction error:', error);
      return null;
    }
  }

  // Features çıkarma
  extractFeatures() {
    try {
      const features = {
        guvenlik: [],
        konfor: [],
        disDonanim: [],
        multimedya: []
      };

      // H3 başlıklarını bul
      const h3Elements = document.querySelectorAll('h3');

      h3Elements.forEach(h3 => {
        const sectionTitle = h3.textContent.trim();
        let targetArray = null;

        if (sectionTitle === 'Güvenlik') {
          targetArray = features.guvenlik;
        } else if (sectionTitle === 'İç Donanım') {
          targetArray = features.konfor;
        } else if (sectionTitle === 'Dış Donanım') {
          targetArray = features.disDonanim;
        } else if (sectionTitle === 'Multimedya') {
          targetArray = features.multimedya;
        }

        if (targetArray) {
          // UL elementini bul
          let nextElement = h3.nextElementSibling;
          while (nextElement && nextElement.tagName !== 'UL') {
            nextElement = nextElement.nextElementSibling;
          }

          if (nextElement && nextElement.tagName === 'UL') {
            const listItems = nextElement.querySelectorAll('li');
            listItems.forEach(li => {
              const text = li.textContent.trim()
                .replace(/Oto Sözlük'te Detaylı Oku/g, '').trim();
              
              if (text && text.length > 2) {
                const isChecked = li.classList.contains('selected');
                targetArray.push({
                  name: text,
                  checked: isChecked
                });
              }
            });
          }
        }
      });

      const totalFeatures = Object.values(features).reduce((sum, arr) => sum + arr.length, 0);
      return totalFeatures > 0 ? features : null;

    } catch (error) {
      console.error('Features extraction error:', error);
      return null;
    }
  }

  // Paint/Damage çıkarma
  extractPaintDamage() {
    try {
      const paintDamage = {
        paintedParts: [],
        changedParts: [],
        damageAreas: {}
      };

      // car-damage-info-list'ten çıkar
      const damageList = document.querySelector('.car-damage-info-list');
      if (damageList) {
        let currentSection = null;
        const allLis = damageList.querySelectorAll('li');

        allLis.forEach(li => {
          const text = li.textContent.trim();
          const classes = li.className || '';

          if (text.includes('Boyalı Parçalar')) {
            currentSection = 'painted';
          } else if (text.includes('Değişen Parçalar')) {
            currentSection = 'changed';
          } else if (classes.includes('selected-damage') && text && currentSection) {
            if (currentSection === 'painted') {
              paintDamage.paintedParts.push(text);
            } else if (currentSection === 'changed') {
              paintDamage.changedParts.push(text);
            }
          }
        });
      }

      // car-parts visual diagram'dan çıkar
      const carParts = document.querySelectorAll('.car-parts > div');
      carParts.forEach(part => {
        const classes = part.className || '';
        let partName = null;
        let status = null;

        // Part name çıkar
        const classArray = classes.split(' ');
        for (const cls of classArray) {
          if (cls.includes('bumper') || cls.includes('hood') || 
              cls.includes('roof') || cls.includes('door') || 
              cls.includes('mudguard')) {
            partName = cls.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            break;
          }
        }

        // Status çıkar
        if (classes.includes('original-new')) {
          status = 'Original';
        } else if (classes.includes('painted-new')) {
          status = 'Boyalı';
        } else if (classes.includes('changed-new')) {
          status = 'Değişen';
        } else if (classes.includes('local-painted-new')) {
          status = 'Lokal Boyalı';
        }

        if (partName && status) {
          paintDamage.damageAreas[partName] = status;
        }
      });

      const totalDamageInfo = paintDamage.paintedParts.length + 
                            paintDamage.changedParts.length + 
                            Object.keys(paintDamage.damageAreas).length;

      return totalDamageInfo > 0 ? paintDamage : null;

    } catch (error) {
      console.error('Paint damage extraction error:', error);
      return null;
    }
  }

  // Manuel scraping başlatma
  startManualScraping() {
    console.log('🚀 Manuel scraping başlatılıyor...');
    return this.scrapePage();
  }

  // Sonuçları al
  getResults() {
    return this.results;
  }

  // Sonuçları temizle
  clearResults() {
    this.results = [];
    console.log('🗑️ Scraping sonuçları temizlendi');
  }
}

// Global scraper instance
window.sahibindenScraper = new SahibindenScraper();

// Sayfa yüklendiğinde otomatik başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.sahibindenScraper.autoScrapeAfterCookieClean();
    }, 1000);
  });
} else {
  setTimeout(() => {
    window.sahibindenScraper.autoScrapeAfterCookieClean();
  }, 1000);
}

console.log('🤖 Sahibinden Scraper yüklendi');