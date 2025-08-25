// Site listesini yükle ve göster
function loadSites() {
  chrome.storage.local.get(['sites'], (result) => {
    const sites = result.sites || ['sahibinden.com'];
    displaySites(sites);
  });
}

// Cloudflare seçeneğini yükle
function loadCloudflareOption() {
  chrome.storage.local.get(['deleteCloudflare'], (result) => {
    const deleteCloudflare = result.deleteCloudflare !== undefined ? result.deleteCloudflare : true;
    document.getElementById('cloudflareToggle').checked = deleteCloudflare;
  });
}

// Siteleri ekranda göster
function displaySites(sites) {
  const listElement = document.getElementById('siteList');
  listElement.innerHTML = '';

  sites.forEach((site, index) => {
    const div = document.createElement('div');
    div.className = 'site-item';
    div.innerHTML = `
      <span class="site-name">${site}</span>
      <button class="remove-btn" data-index="${index}">Kaldır</button>
    `;
    listElement.appendChild(div);
  });

  // Kaldır butonlarına event listener ekle
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', removeSite);
  });
}

// Yeni site ekle
document.getElementById('addBtn').addEventListener('click', () => {
  const input = document.getElementById('newSite');
  const site = input.value.trim().toLowerCase();

  if (site) {
    chrome.storage.local.get(['sites'], (result) => {
      const sites = result.sites || [];
      if (!sites.includes(site)) {
        sites.push(site);
        chrome.storage.local.set({ sites: sites }, () => {
          loadSites();
          input.value = '';
          showStatus('Site eklendi: ' + site);

          chrome.runtime.sendMessage({ action: 'updateSites', sites: sites });
        });
      } else {
        showStatus('Bu site zaten listede!');
      }
    });
  }
});

// Site kaldır
function removeSite(e) {
  const index = parseInt(e.target.dataset.index);

  chrome.storage.local.get(['sites'], (result) => {
    const sites = result.sites || [];
    const removedSite = sites[index];
    sites.splice(index, 1);
    chrome.storage.local.set({ sites: sites }, () => {
      loadSites();
      showStatus('Site kaldırıldı: ' + removedSite);

      chrome.runtime.sendMessage({ action: 'updateSites', sites: sites });
    });
  });
}

// Cloudflare toggle
document.getElementById('cloudflareToggle').addEventListener('change', (e) => {
  const value = e.target.checked;
  chrome.runtime.sendMessage({ action: 'updateCloudflareOption', value: value });
  showStatus(value ? 'cf_clearance silinecek' : 'cf_clearance korunacak');
});

// Şimdi temizle butonu (Cloudflare versiyonu)
document.getElementById('clearNowBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearNow' }, (response) => {
    if (response && response.success) {
      showStatus('Cookie\'ler temizlendi!');
    }
  });
});

// Manuel temizleme butonu - Sahibinden.com özel
document.getElementById('manualClean').addEventListener('click', () => {
  // Force clear çalıştır
  if (typeof forceClearCfClearance !== 'undefined') {
    forceClearCfClearance();
  }
  
  // Önce cf_clearance'ı global olarak temizle
  chrome.runtime.sendMessage({ action: 'clearCloudflareGlobal' }, (cfResponse) => {
    console.log(`cf_clearance temizleme: ${cfResponse ? cfResponse.count : 0} adet`);
    
    // Sonra sahibinden cookie'lerini temizle
    chrome.runtime.sendMessage({ action: 'clearSahibinden' }, (response) => {
      if (response && response.success) {
        const btn = document.getElementById('manualClean');
        const originalText = btn.innerHTML;
        const totalCount = response.count + (cfResponse ? cfResponse.count : 0);
        btn.innerHTML = `<span class="emoji">✅</span>TEMİZLENDİ! (${totalCount} cookie)`;
        btn.style.background = '#5cb85c';

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '#ff4757';
        }, 3000);
        
        showStatus(`Toplam ${totalCount} cookie temizlendi!`);
      }
    });
  });
});

// Durum mesajı göster
function showStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.classList.add('show');
  setTimeout(() => {
    status.classList.remove('show');
  }, 3000);
}

// Enter tuşu ile ekleme
document.getElementById('newSite').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('addBtn').click();
  }
});

// Sürekli temizleme butonu
let continuousEnabled = false;

document.getElementById('continuousBtn').addEventListener('click', () => {
  continuousEnabled = !continuousEnabled;
  const btn = document.getElementById('continuousBtn');
  
  if (continuousEnabled) {
    chrome.runtime.sendMessage({ action: 'startContinuous' }, (response) => {
      if (response && response.success) {
        btn.innerHTML = '⏹️ Sürekli Temizleme: AÇIK';
        btn.style.background = '#e74c3c';
        showStatus('Sürekli temizleme başlatıldı! Her 5 saniyede cf_clearance silinecek.');
        chrome.storage.local.set({ continuousCleaning: true });
      }
    });
  } else {
    chrome.runtime.sendMessage({ action: 'stopContinuous' }, (response) => {
      if (response && response.success) {
        btn.innerHTML = '♻️ Sürekli Temizleme: KAPALI';
        btn.style.background = '#27ae60';
        showStatus('Sürekli temizleme durduruldu.');
        chrome.storage.local.set({ continuousCleaning: false });
      }
    });
  }
});

// Sürekli temizleme durumunu kontrol et
function checkContinuousStatus() {
  chrome.runtime.sendMessage({ action: 'getContinuousStatus' }, (response) => {
    if (response && response.enabled) {
      continuousEnabled = true;
      const btn = document.getElementById('continuousBtn');
      btn.innerHTML = '⏹️ Sürekli Temizleme: AÇIK';
      btn.style.background = '#e74c3c';
    }
  });
  
  // Storage'dan da kontrol et
  chrome.storage.local.get(['continuousCleaning'], (result) => {
    if (result.continuousCleaning) {
      chrome.runtime.sendMessage({ action: 'startContinuous' });
    }
  });
}

// Scraper kontrolleri
document.getElementById('scraperInjectBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'injectScraper' }, (response) => {
    if (response && response.success) {
      showStatus('Scraper manuel olarak başlatıldı!');
    }
  });
});

document.getElementById('exportResultsBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'exportResults' }, (response) => {
    if (response && response.success) {
      showStatus(`${response.count} sonuç JSON olarak indirildi!`);
    }
  });
});

document.getElementById('clearResultsBtn').addEventListener('click', () => {
  if (confirm('Tüm scraping sonuçları silinecek. Emin misiniz?')) {
    chrome.runtime.sendMessage({ action: 'clearResults' }, (response) => {
      if (response && response.success) {
        updateResultCount();
        showStatus('Tüm sonuçlar temizlendi!');
      }
    });
  }
});

// Sonuç sayısını güncelle
function updateResultCount() {
  chrome.runtime.sendMessage({ action: 'getResults' }, (response) => {
    if (response && response.success) {
      const count = response.results ? response.results.length : 0;
      document.getElementById('resultCount').textContent = count;
    }
  });
}

// Botasaurus kontrolleri
document.getElementById('botasaurusStatusBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('botasaurusStatus');
  statusDiv.style.display = 'block';
  statusDiv.innerHTML = '🔄 Server durumu kontrol ediliyor...';
  
  // Active tab'da bridge'i çalıştır
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url.includes('sahibinden.com')) {
      
      // Önce bridge'i inject et
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['botasaurus_bridge.js']
      }, () => {
        
        // Bridge yüklendikten sonra status kontrol et
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: async () => {
              if (window.botasaurusBridge) {
                const status = await window.botasaurusBridge.checkServerStatus();
                return status;
              }
              return { error: 'Bridge not loaded' };
            }
          }, (results) => {
            if (results && results[0]) {
              const status = results[0].result;
              
              if (status && !status.error) {
                statusDiv.innerHTML = `
                  ✅ Server çalışıyor<br>
                  📁 Scraper: ${status.scraper_exists ? '✅ Mevcut' : '❌ Bulunamadı'}<br>
                  📍 Path: ${status.scraper_path || 'N/A'}
                `;
              } else {
                statusDiv.innerHTML = `❌ Server hatası: ${status.error}<br>💡 <code>python scraper_server.py</code> ile başlatın`;
              }
            } else {
              statusDiv.innerHTML = '❌ Bridge yüklenemedi veya hata oluştu';
            }
          });
        }, 500);
        
      });
    } else {
      statusDiv.innerHTML = '⚠️ Sahibinden.com sayfasında değilsiniz';
    }
  });
});

document.getElementById('botasaurusRunBtn').addEventListener('click', () => {
  const statusDiv = document.getElementById('botasaurusStatus');
  statusDiv.style.display = 'block';
  statusDiv.innerHTML = '🚀 Botasaurus scraper başlatılıyor...';
  
  // Active tab'da bridge'i çalıştır
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url.includes('sahibinden.com')) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: async () => {
          if (window.botasaurusBridge) {
            const result = await window.botasaurusBridge.scrapeCollectedUrls();
            return result;
          }
          return {success: false, error: 'Bridge not loaded'};
        }
      }, (results) => {
        if (results && results[0]) {
          const result = results[0].result;
          if (result.success) {
            statusDiv.innerHTML = `✅ Scraper başarıyla tamamlandı!<br>📊 İşlenen URL: ${result.urls_processed || 0}`;
            showStatus('Botasaurus scraper tamamlandı!');
          } else {
            statusDiv.innerHTML = `❌ Scraper hatası:<br>${result.error}`;
          }
        }
      });
    } else {
      statusDiv.innerHTML = '⚠️ Sahibinden.com sayfasında değilsiniz';
    }
  });
});

// Sayfa yüklendiğinde
loadSites();
loadCloudflareOption();
checkContinuousStatus();
updateResultCount();
