document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');
  const urlList = document.getElementById('urlList');
  
  let allStoredUrls = [];
  
  // Sayfa açılınca önceki URL'leri yükle
  loadStoredUrls();
  
  extractBtn.addEventListener('click', function() {
    status.innerHTML = '<div>🔍 URL\'ler aranıyor...</div>';
    
    // Aktif sekmeyi al
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      
      console.log('Active tab URL:', activeTab.url);
      
      // Content script'i inject et ve URL'leri çek
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }, function(results) {
        if (chrome.runtime.lastError) {
          status.innerHTML = '<div style="color:red">❌ Script hatası: ' + chrome.runtime.lastError.message + '</div>';
          return;
        }
        
        // Kısa bir bekleme sonrası URL'leri çek
        setTimeout(() => {
          chrome.tabs.sendMessage(activeTab.id, {action: 'extractUrls'}, function(response) {
            if (chrome.runtime.lastError) {
              status.innerHTML = '<div style="color:red">❌ Mesaj hatası: ' + chrome.runtime.lastError.message + '</div>';
              return;
            }
            
            if (response && response.urls) {
              addNewUrls(response.urls, response.pageTitle);
            } else {
              status.innerHTML = '<div style="color:red">❌ URL bulunamadı!</div>';
            }
          });
        }, 500);
      });
    });
  });
  
  function loadStoredUrls() {
    chrome.storage.local.get(['storedUrls'], function(result) {
      if (result.storedUrls) {
        allStoredUrls = result.storedUrls;
        displayAllUrls();
      } else {
        status.innerHTML = '<div>💾 Hafıza boş - İlk sayfayı çekin</div>';
      }
    });
  }
  
  function addNewUrls(newUrls, pageTitle) {
    const beforeCount = allStoredUrls.length;
    
    // Yeni URL'leri mevcut listeye ekle (benzersiz)
    newUrls.forEach(url => {
      if (!allStoredUrls.includes(url)) {
        allStoredUrls.push(url);
      }
    });
    
    const addedCount = allStoredUrls.length - beforeCount;
    
    // Storage'a kaydet
    chrome.storage.local.set({ storedUrls: allStoredUrls }, function() {
      console.log('URLs saved to storage');
    });
    
    // Sonuçları göster
    status.innerHTML = `
      <div class="count">✅ Bu sayfadan ${newUrls.length} URL bulundu!</div>
      <div class="count">🆕 ${addedCount} yeni URL eklendi</div>
      <div>📄 Sayfa: ${pageTitle || 'Bilinmiyor'}</div>
    `;
    
    displayAllUrls();
  }
  
  function displayAllUrls() {
    if (allStoredUrls.length === 0) {
      urlList.value = '';
      downloadBtn.style.display = 'none';
      copyBtn.style.display = 'none';
      return;
    }
    
    // URL'leri textarea'da göster
    urlList.value = allStoredUrls.join('\n');
    
    // Butonları göster
    downloadBtn.style.display = 'block';
    copyBtn.style.display = 'block';
    
    // İstatistikler
    const stats = analyzeUrls(allStoredUrls);
    status.innerHTML += `
      <hr>
      <div>📊 TOPLAM HAFİZA:</div>
      <div class="count">🔢 Toplam: ${allStoredUrls.length} URL</div>
      <div>• Vasıta ilanları: ${stats.vasita}</div>
      <div>• Emlak ilanları: ${stats.emlak}</div>
      <div>• Diğer: ${stats.other}</div>
      <div style="font-size:12px; color:#666; margin-top:5px;">
        💡 Yeni sayfalara gidin ve URL'leri çekmeye devam edin!
      </div>
    `;
  }
  
  function analyzeUrls(urls) {
    let stats = {
      vasita: 0,
      emlak: 0,
      other: 0
    };
    
    urls.forEach(url => {
      if (url.includes('/vasita-')) stats.vasita++;
      else if (url.includes('/emlak-')) stats.emlak++;
      else stats.other++;
    });
    
    return stats;
  }
  
  downloadBtn.addEventListener('click', function() {
    if (allStoredUrls.length === 0) {
      status.innerHTML += '<div style="color:red">❌ İndirilecek URL yok!</div>';
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sahibinden_urls_ALL_${timestamp}.txt`;
    const content = allStoredUrls.join('\n');
    
    // Blob oluştur ve indir
    const blob = new Blob([content], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    
    // Download link oluştur
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    status.innerHTML += '<div>✅ ' + allStoredUrls.length + ' URL indirildi: ' + filename + '</div>';
  });
  
  copyBtn.addEventListener('click', function() {
    if (allStoredUrls.length === 0) {
      status.innerHTML += '<div style="color:red">❌ Kopyalanacak URL yok!</div>';
      return;
    }
    
    urlList.select();
    document.execCommand('copy');
    
    // Visual feedback
    copyBtn.textContent = '✅ Kopyalandı!';
    copyBtn.style.background = '#4CAF50';
    
    setTimeout(() => {
      copyBtn.textContent = '📋 Kopyala';
      copyBtn.style.background = '#FF9800';
    }, 2000);
    
    status.innerHTML += '<div>✅ ' + allStoredUrls.length + ' URL kopyalandı!</div>';
  });
  
  clearBtn.addEventListener('click', function() {
    if (confirm('Tüm kayıtlı URL\'leri silmek istediğinizden emin misiniz?')) {
      allStoredUrls = [];
      chrome.storage.local.remove(['storedUrls'], function() {
        status.innerHTML = '<div>🗑️ Hafıza temizlendi!</div>';
        urlList.value = '';
        downloadBtn.style.display = 'none';
        copyBtn.style.display = 'none';
      });
    }
  });
});