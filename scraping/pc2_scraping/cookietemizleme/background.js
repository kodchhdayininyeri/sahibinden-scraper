// ========== background.js - BİRLEŞTİRİLMİŞ VERSİYON ==========

// Cookie'leri silinecek siteler listesi (varsayılan)
let targetSites = [
  "sahibinden.com",
  "facebook.com",
  "twitter.com"
];

// Korunacak cookie'ler (bunları SİLME)
let protectedCookies = [
  // "cf_clearance",  // Cloudflare bot koruması
  // "__cf_bm",       // Cloudflare bot yönetimi
  // "auth_token",    // Giriş bilgileri
  // "session_id"     // Oturum bilgisi
];

// cf_clearance'ı da silmek istiyorsanız
let deleteCloudflareProtection = true; // true = cf_clearance'ı da sil

// Cloudflare cookie'lerini özel olarak temizle
let cloudflareTargetCookies = [
  "cf_clearance",
  "__cf_bm",
  "__cfruid",
  "__cflb",
  "__cfuvid",
  "cf_chl_2",
  "cf_chl_prog",
  "cf_chl_rc_i"
];

// Sürekli temizleme için interval
let continuousCleanInterval = null;
let continuousCleanEnabled = false;

// Scraper sonuçları için storage
let scrapingResults = [];
let scrapingEnabled = true;

// Storage'dan ayarları yükle
chrome.storage.local.get(['sites', 'deleteCloudflare', 'protectedCookies', 'scrapingResults'], (result) => {
  if (result.sites) targetSites = result.sites;
  if (result.deleteCloudflare !== undefined) deleteCloudflareProtection = result.deleteCloudflare;
  if (result.protectedCookies) protectedCookies = result.protectedCookies;
  if (result.scrapingResults) {
    scrapingResults = result.scrapingResults;
    console.log(`📊 ${scrapingResults.length} scraping sonucu yüklendi`);
    
    // Badge'e sayıyı göster
    if (scrapingResults.length > 0) {
      chrome.action.setBadgeText({text: scrapingResults.length.toString()});
      chrome.action.setBadgeBackgroundColor({color: "#2196F3"});
    }
  }
});

// OTOMATİK TEMİZLEME KAPALI - SADECE MANUEL BUTON İLE
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.status === 'complete' && tab.url) {
//     // Sahibinden.com için 0.5 saniye bekle
//     if (tab.url.includes('sahibinden.com')) {
//       setTimeout(() => {
//         checkAndClearCookies(tab.url, tabId);
//       }, 500); // 0.5 saniye gecikme
//     } else {
//       checkAndClearCookies(tab.url, tabId);
//     }
//   }
// });

// URL'yi kontrol et ve gerekirse cookie'leri sil
function checkAndClearCookies(url, tabId) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');

    // Bu site listede var mı kontrol et
    const shouldClear = targetSites.some(site =>
      hostname.includes(site.replace('www.', ''))
    );

    if (shouldClear) {
      // Sahibinden.com ise özel temizleme fonksiyonunu çalıştır
      if (hostname.includes('sahibinden.com')) {
        // Manuel temizleme ile aynı işlemi yap
        performFullSahibindenClean();
      } else {
        clearCookiesForDomain(hostname, urlObj, tabId);
      }
      console.log(`Cookie temizleme başlatıldı: ${hostname}`);
    }
  } catch (error) {
    console.error('URL işlenemedi:', error);
  }
}

// Sahibinden için tam temizleme
function performFullSahibindenClean() {
  console.log("🧹 Sahibinden.com temizleme 0.5 saniye sonra başlayacak...");
  
  // 0.5 saniye sonra temizle
  setTimeout(() => {
    console.log("🚀 Temizleme başlıyor!");
    
    // Önce browsingData API ile temizle
    chrome.browsingData.remove({
      "origins": ["https://sahibinden.com", "http://sahibinden.com", "https://www.sahibinden.com"]
    }, {
      "cookies": true
    }, () => {
      console.log("BrowsingData API ile sahibinden.com cookie'leri temizlendi");
    });
    
    // cf_clearance'ı global olarak temizle
    chrome.cookies.getAll({name: 'cf_clearance'}, (cookies) => {
      cookies.forEach(cookie => {
        const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
        chrome.cookies.remove({url: url, name: 'cf_clearance'}, (details) => {
          if (details) {
            console.log(`✅ cf_clearance silindi: ${cookie.domain}`);
          }
        });
      });
    });
    
    // Tüm sahibinden cookie'lerini temizle
    chrome.cookies.getAll({}, (cookies) => {
      const sahibindenCookies = cookies.filter(cookie => {
        const domain = cookie.domain.toLowerCase();
        
        // cf_clearance ve __cf_bm her zaman sil
        if (cookie.name === 'cf_clearance' || cookie.name === '__cf_bm') {
          return true;
        }
        
        return domain.includes('sahibinden') || 
               domain === '.sahibinden.com' ||
               domain === 'sahibinden.com' ||
               domain.endsWith('.sahibinden.com');
      });
      
      console.log(`🎯 ${sahibindenCookies.length} cookie bulundu, siliniyor...`);
      
      sahibindenCookies.forEach(cookie => {
        // Farklı URL formatları dene
        const urls = [
          `https://www.sahibinden.com${cookie.path}`,
          `https://sahibinden.com${cookie.path}`,
          `http://www.sahibinden.com${cookie.path}`,
          `http://sahibinden.com${cookie.path}`,
          `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`
        ];
        
        urls.forEach(url => {
          chrome.cookies.remove({
            url: url,
            name: cookie.name
          }, (details) => {
            if (details) {
              console.log(`✅ Otomatik silindi: ${cookie.name}`);
            }
          });
        });
      });
      
      // SÜREKLİ TEMİZLEME KAPALI - SADECE MANUEL
      // setTimeout(() => {
      //   console.log("♻️ Sürekli temizleme modu otomatik başlatılıyor...");
      //   startContinuousCleaning();
      // }, 2000);
      
      // 3 saniye sonra scraper'ı başlat
      setTimeout(() => {
        if (scrapingEnabled) {
          console.log("🤖 Scraper inject ediliyor...");
          injectScraperScript();
          
          // Botasaurus bridge'i de inject et
          setTimeout(() => {
            injectBotasaurusBridge();
          }, 1000);
        }
      }, 3000);
    });
  }, 500); // 0.5 saniye gecikme
}

// Belirli bir domain için cookie'leri sil
function clearCookiesForDomain(domain, urlObj, tabId) {
  // Sahibinden.com için özel temizleme
  if (domain.includes('sahibinden.com')) {
    clearAllSahibindenCookies(tabId);
    return;
  }
  
  chrome.cookies.getAll({}, (cookies) => {
    let deletedCount = 0;
    let protectedCount = 0;

    cookies.forEach(cookie => {
      if (cookie.domain.includes(domain) || domain.includes(cookie.domain.replace('.', ''))) {

        // Korumalı cookie kontrolü - hiçbir cookie korunmasın
        if (protectedCookies.includes(cookie.name)) {
          console.log(`Korundu: ${cookie.name}`);
          protectedCount++;
          return;
        }

        // TÜM cookie'leri sil (cf_clearance dahil)
        const cookieUrl = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`;
        chrome.cookies.remove({
          url: cookieUrl,
          name: cookie.name
        }, (details) => {
          if (details) {
            deletedCount++;
            console.log(`✓ Silindi: ${cookie.name}`);
          } else {
            console.log(`✗ Silinemedi: ${cookie.name}`);
          }
        });
      }
    });

    // Durum bildirimi
    setTimeout(() => {
      showNotification(domain, deletedCount, protectedCount);
    }, 500);
  });

  // LocalStorage ve SessionStorage temizle
  clearWebStorage(tabId);
}

// Sahibinden.com için özel temizleme fonksiyonu
function clearAllSahibindenCookies(tabId) {
  let totalDeleted = 0;
  let totalChecked = 0;
  let processedCount = 0;
  
  chrome.cookies.getAll({}, (cookies) => {
    // Sahibinden.com ile ilgili TÜM cookie'leri bul (cf_clearance dahil)
    const sahibindenCookies = cookies.filter(cookie => {
      const domain = cookie.domain.toLowerCase();
      
      // cf_clearance özel kontrolü - hangi domainde olursa olsun
      if (cookie.name === 'cf_clearance') {
        console.log(`🎯 cf_clearance BULUNDU! Domain: ${cookie.domain}, Path: ${cookie.path}`);
        return true;
      }
      
      // Sahibinden domain kontrolü
      return domain.includes('sahibinden') || 
             domain === '.sahibinden.com' ||
             domain === 'sahibinden.com' ||
             domain === 'www.sahibinden.com' ||
             domain.endsWith('.sahibinden.com');
    });
    
    totalChecked = sahibindenCookies.length;
    console.log(`Sahibinden.com için ${totalChecked} cookie bulundu`);
    
    if (totalChecked === 0) {
      console.log('Sahibinden.com için cookie bulunamadı');
      showNotification('sahibinden.com', 0, 0);
      return;
    }
    
    // Her cookie için detaylı log ve silme
    sahibindenCookies.forEach(cookie => {
      console.log(`Cookie bulundu: ${cookie.name} - Domain: ${cookie.domain} - Path: ${cookie.path}`);
      
      // cf_clearance özel kontrolü
      if (cookie.name === 'cf_clearance') {
        console.log('⚠️ cf_clearance bulundu, siliniyor...');
      }
      
      // URL'yi doğru şekilde oluştur
      let cookieUrl;
      if (cookie.domain.startsWith('.')) {
        // .sahibinden.com için
        cookieUrl = `https://www${cookie.domain}${cookie.path}`;
      } else {
        // sahibinden.com veya www.sahibinden.com için
        cookieUrl = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`;
      }
      
      chrome.cookies.remove({
        url: cookieUrl,
        name: cookie.name
      }, (details) => {
        processedCount++;
        
        if (details) {
          totalDeleted++;
          console.log(`✅ Silindi: ${cookie.name} (${cookie.domain})`);
        } else {
          // Hata durumunda alternatif URL dene
          const altUrl = `https://sahibinden.com${cookie.path}`;
          chrome.cookies.remove({
            url: altUrl,
            name: cookie.name
          }, (altDetails) => {
            if (altDetails) {
              totalDeleted++;
              console.log(`✅ Alternatif URL ile silindi: ${cookie.name}`);
            } else {
              console.log(`❌ Silinemedi: ${cookie.name} (${cookie.domain})`);
            }
          });
        }
        
        // Son cookie de işlendiyse bildirim göster
        if (processedCount === totalChecked) {
          console.log(`Toplam: ${totalDeleted}/${totalChecked} cookie silindi`);
          showNotification('sahibinden.com', totalDeleted, 0);
        }
      });
    });
  });
  
  // Web Storage temizle
  if (tabId) {
    clearWebStorage(tabId);
  }
}

// Web Storage temizleme
function clearWebStorage(tabId) {
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    func: () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('Web Storage temizlendi');
      } catch (e) {
        console.error('Storage temizlenemedi:', e);
      }
    }
  }).catch(err => console.error('Script çalıştırılamadı:', err));
}

// Bildirim göster
function showNotification(domain, deletedCount, protectedCount) {
  let message = `${deletedCount} cookie silindi`;
  if (protectedCount > 0) {
    message += `, ${protectedCount} korundu`;
  }

  chrome.action.setBadgeText({text: deletedCount.toString()});
  chrome.action.setBadgeBackgroundColor({color: "#4CAF50"});

  console.log(`[${domain}] ${message}`);

  setTimeout(() => {
    chrome.action.setBadgeText({text: ""});
  }, 3000);
}

// cf_clearance'ı sürekli temizle
function startContinuousCleaning() {
  if (continuousCleanInterval) {
    clearInterval(continuousCleanInterval);
  }
  
  continuousCleanEnabled = true;
  console.log("🔄 Sürekli temizleme başlatıldı");
  
  // Her 3 saniyede bir cf_clearance'ı kontrol et ve sil
  continuousCleanInterval = setInterval(() => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('sahibinden.com')) {
        // cf_clearance'ı TÜM domainlerde ara ve sil
        chrome.cookies.getAll({}, (cookies) => {
          cookies.forEach(cookie => {
            if (cookie.name === 'cf_clearance') {
              const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
              chrome.cookies.remove({url: url, name: 'cf_clearance'}, (details) => {
                if (details) {
                  console.log(`🔄 cf_clearance otomatik silindi: ${cookie.domain}`);
                }
              });
            }
          });
        });
      }
    });
  }, 3000); // 3 saniyede bir kontrol
}

function stopContinuousCleaning() {
  if (continuousCleanInterval) {
    clearInterval(continuousCleanInterval);
    continuousCleanInterval = null;
  }
  continuousCleanEnabled = false;
  console.log("⏹️ Sürekli temizleme durduruldu");
}

// Scraper script'ini inject et
function injectScraperScript() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('sahibinden.com')) {
      const tabId = tabs[0].id;
      
      // Scraper script'ini inject et
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['scraper.js']
      }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Scraper injection error:', chrome.runtime.lastError);
        } else {
          console.log('✅ Scraper successfully injected');
        }
      });
    }
  });
}

// Botasaurus bridge'i inject et
function injectBotasaurusBridge() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('sahibinden.com')) {
      const tabId = tabs[0].id;
      
      // Bridge script'ini inject et
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['botasaurus_bridge.js']
      }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Botasaurus bridge injection error:', chrome.runtime.lastError);
        } else {
          console.log('✅ Botasaurus bridge successfully injected');
        }
      });
    }
  });
}

// Scraping sonuçlarını kaydet
function saveScrapingResult(result) {
  scrapingResults.push({
    ...result,
    id: Date.now(),
    saved_at: new Date().toISOString()
  });
  
  // Storage'a kaydet
  chrome.storage.local.set({
    scrapingResults: scrapingResults
  }, () => {
    console.log('📊 Scraping result saved:', result.data?.title || 'No title');
  });
  
  // Badge'e sonuç sayısını göster
  chrome.action.setBadgeText({text: scrapingResults.length.toString()});
  chrome.action.setBadgeBackgroundColor({color: "#2196F3"});
}

// Scraping sonuçlarını export et
function exportScrapingResults() {
  if (scrapingResults.length === 0) {
    console.log('📭 Export edilecek scraping sonucu yok');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sahibinden_scraping_${timestamp}.json`;
  
  const blob = new Blob([JSON.stringify(scrapingResults, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError);
    } else {
      console.log(`📥 Scraping results exported: ${filename}`);
    }
  });
}

// Content script'ten gelen bot detection mesajlarını dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Bot detection tetikleyici
  if (request.action === 'botDetected') {
    console.log('🤖🚨 BOT DETECTION RECEIVED from content script!');
    console.log('🔧 Triggering automatic cleanup...');
    // Otomatik sahibinden temizleme yap
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('sahibinden.com')) {
        console.log('✅ Sahibinden tab found, performing cleanup...');
        performFullSahibindenClean();
        sendResponse({success: true, message: 'Automatic cleanup triggered'});
      } else {
        console.log('❌ Sahibinden tab not found');
        sendResponse({success: false, message: 'Not on sahibinden'});
      }
    });
    return true; // Async response için
  }
  
  // clearSahibinden action (eski yöntem)
  if (request.action === 'clearSahibinden') {
    console.log('🧹 Manual clearSahibinden action received');
    performFullSahibindenClean();
    sendResponse({success: true, message: 'Manual cleanup triggered'});
    return true;
  }

// Popup'tan gelen mesajları dinle
  if (request.action === 'updateSites') {
    targetSites = request.sites;
    console.log('Site listesi güncellendi:', targetSites);
  }

  if (request.action === 'updateCloudflareOption') {
    deleteCloudflareProtection = request.value;
    chrome.storage.local.set({deleteCloudflare: request.value});
    console.log('Cloudflare seçeneği:', deleteCloudflareProtection);
  }

  if (request.action === 'clearNow') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        checkAndClearCookies(tabs[0].url, tabs[0].id);
        sendResponse({success: true});
      }
    });
    return true; // Async response için
  }
  
  // cf_clearance'ı global olarak temizle
  if (request.action === 'clearCloudflareGlobal') {
    // Önce browsingData API ile temizle
    chrome.browsingData.remove({
      "origins": ["https://sahibinden.com", "http://sahibinden.com", "https://www.sahibinden.com"]
    }, {
      "cookies": true
    }, () => {
      console.log("BrowsingData API ile sahibinden.com cookie'leri temizlendi");
    });
    
    // Sonra normal yöntemle
    chrome.cookies.getAll({name: 'cf_clearance'}, (cookies) => {
      console.log(`Global cf_clearance arama: ${cookies.length} bulundu`);
      cookies.forEach(cookie => {
        console.log(`cf_clearance bulundu - Domain: ${cookie.domain}, Path: ${cookie.path}`);
        const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
        chrome.cookies.remove({url: url, name: 'cf_clearance'}, (details) => {
          if (details) {
            console.log(`✅ cf_clearance silindi: ${cookie.domain}`);
          } else {
            console.log(`❌ cf_clearance silinemedi: ${cookie.domain}`);
          }
        });
      });
      sendResponse({success: true, count: cookies.length});
    });
    return true;
  }

  // Eski sürümdeki manuel domain temizleme (korumalı çerez mantığına entegre)
  if (request.action === 'clearCookies') {
    clearCookiesForDomain(request.domain, null, null);
    sendResponse({success: true});
  }
  
  // Sürekli temizleme kontrolü
  if (request.action === 'startContinuous') {
    startContinuousCleaning();
    sendResponse({success: true});
    return true;
  }
  
  if (request.action === 'stopContinuous') {
    stopContinuousCleaning();
    sendResponse({success: true});
    return true;
  }
  
  if (request.action === 'getContinuousStatus') {
    sendResponse({enabled: continuousCleanEnabled});
    return true;
  }
  
  // Scraper sonucu al
  if (request.action === 'scrapingResult') {
    saveScrapingResult(request.result);
    sendResponse({success: true});
    return true;
  }
  
  // Scraping sonuçlarını export et
  if (request.action === 'exportResults') {
    exportScrapingResults();
    sendResponse({success: true, count: scrapingResults.length});
    return true;
  }
  
  // Scraping sonuçlarını temizle
  if (request.action === 'clearResults') {
    scrapingResults = [];
    chrome.storage.local.remove('scrapingResults');
    chrome.action.setBadgeText({text: ""});
    sendResponse({success: true});
    console.log('🗑️ Tüm scraping sonuçları temizlendi');
    return true;
  }
  
  // Scraping sonuçlarını al
  if (request.action === 'getResults') {
    sendResponse({success: true, results: scrapingResults});
    return true;
  }
  
  // Manuel scraper injection
  if (request.action === 'injectScraper') {
    injectScraperScript();
    sendResponse({success: true});
    return true;
  }
  
  // Sahibinden.com özel temizleme
  if (request.action === 'clearSahibinden') {
    let totalDeleted = 0;
    let processedCount = 0;
    
    chrome.cookies.getAll({}, (cookies) => {
      // Sahibinden ile ilgili TÜM cookie'leri bul + cf_clearance
      const sahibindenCookies = cookies.filter(cookie => {
        const domain = cookie.domain.toLowerCase();
        
        // cf_clearance özel kontrolü - hangi domainde olursa olsun sil
        if (cookie.name === 'cf_clearance' || cookie.name === '__cf_bm') {
          console.log(`🔴 Cloudflare cookie bulundu: ${cookie.name} - Domain: ${cookie.domain}`);
          return true;
        }
        
        return domain.includes('sahibinden') || 
               domain === '.sahibinden.com' ||
               domain === 'sahibinden.com' ||
               domain.endsWith('.sahibinden.com');
      });
      
      const totalCount = sahibindenCookies.length;
      console.log(`Manuel temizleme: ${totalCount} cookie bulundu`);
      
      if (totalCount === 0) {
        sendResponse({success: true, count: 0});
        return;
      }
      
      // Her bir cookie'yi sil
      sahibindenCookies.forEach((cookie) => {
        console.log(`Siliniyor: ${cookie.name} - ${cookie.domain}`);
        
        // cf_clearance için özel URL formatı
        let urls = [];
        
        if (cookie.name === 'cf_clearance' || cookie.name === '__cf_bm') {
          // cf_clearance için tüm olası URL'leri dene
          urls = [
            'https://sahibinden.com/',
            'https://www.sahibinden.com/',
            'http://sahibinden.com/',
            'http://www.sahibinden.com/',
            `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
            `http://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
            `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`
          ];
          console.log(`cf_clearance için URL'ler deneniyor...`);
        } else {
          // Diğer cookie'ler için standart URL'ler
          urls = [
            `https://www.sahibinden.com${cookie.path}`,
            `https://sahibinden.com${cookie.path}`,
            `http://www.sahibinden.com${cookie.path}`,
            `http://sahibinden.com${cookie.path}`,
            `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`
          ];
        }
        
        let deleted = false;
        let attempts = 0;
        
        urls.forEach(url => {
          if (!deleted) {
            chrome.cookies.remove({
              url: url,
              name: cookie.name
            }, (details) => {
              attempts++;
              if (details && !deleted) {
                deleted = true;
                totalDeleted++;
                console.log(`✅ Silindi: ${cookie.name} - URL: ${url}`);
              }
              
              // Tüm denemeler bittiğinde
              if (attempts === urls.length) {
                processedCount++;
                if (!deleted) {
                  console.log(`❌ Silinemedi: ${cookie.name}`);
                }
                
                // Son cookie de işlendiyse response gönder
                if (processedCount === totalCount) {
                  console.log(`Toplam: ${totalDeleted}/${totalCount} cookie silindi`);
                  sendResponse({success: true, count: totalDeleted});
                  showNotification('sahibinden.com', totalDeleted, 0);
                }
              }
            });
          }
        });
      });
    });
    
    return true; // Async response için
  }
});
