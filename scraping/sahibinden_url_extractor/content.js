// Sahibinden.com sayfasından URL'leri çek
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'ping') {
    sendResponse({status: 'ready'});
    return true;
  }
  
  if (request.action === 'extractUrls') {
    console.log('[URL Extractor] URL çekme isteği alındı');
    
    try {
      const urls = extractSahibindenUrls();
      console.log('[URL Extractor] Toplam URL:', urls.length);
      
      sendResponse({
        urls: urls,
        pageTitle: document.title,
        pageUrl: window.location.href
      });
    } catch (error) {
      console.error('[URL Extractor] Hata:', error);
      sendResponse({
        urls: [],
        error: error.message
      });
    }
  }
  
  return true; // Async response için
});

function extractSahibindenUrls() {
  const urls = new Set(); // Duplicate'leri önlemek için Set kullan
  
  console.log('[URL Extractor] URL çekimi başlıyor...');
  
  // Yöntem 1: classifiedTitle class'ına sahip linkler (Ana ilan başlıkları)
  const titleLinks = document.querySelectorAll('a.classifiedTitle');
  console.log('[URL Extractor] Method 1 - classifiedTitle:', titleLinks.length);
  titleLinks.forEach(link => {
    if (link.href && link.href.includes('/ilan/')) {
      urls.add(cleanUrl(link.href));
    }
  });
  
  // Yöntem 2: searchResultsItem içindeki linkler
  const resultItems = document.querySelectorAll('.searchResultsItem a[href*="/ilan/"]');
  console.log('[URL Extractor] Method 2 - searchResultsItem:', resultItems.length);
  resultItems.forEach(link => {
    if (link.href) {
      urls.add(cleanUrl(link.href));
    }
  });
  
  // Yöntem 3: data-id attribute'u olan tr elementlerinden
  const rows = document.querySelectorAll('tr[data-id]');
  console.log('[URL Extractor] Method 3 - data-id rows:', rows.length);
  rows.forEach(row => {
    const link = row.querySelector('a[href*="/ilan/"]');
    if (link && link.href) {
      urls.add(cleanUrl(link.href));
    }
  });
  
  // Yöntem 4: Tablo içindeki ilan linklerini bul
  const tableLinks = document.querySelectorAll('table a[href*="/ilan/"]');
  console.log('[URL Extractor] Method 4 - table links:', tableLinks.length);
  tableLinks.forEach(link => {
    if (link.href) {
      urls.add(cleanUrl(link.href));
    }
  });
  
  // Yöntem 5: Tüm ilan linklerini topla (fallback)
  const allLinks = document.querySelectorAll('a[href*="/ilan/"]');
  console.log('[URL Extractor] Method 5 - all ilan links:', allLinks.length);
  allLinks.forEach(link => {
    if (link.href && 
        link.href.includes('sahibinden.com/ilan/') && 
        !link.href.includes('#')) {
      urls.add(cleanUrl(link.href));
    }
  });
  
  // Yöntem 6: HTML source'da gömülü linkler
  const bodyText = document.body.innerHTML;
  const urlRegex = /https?:\/\/[^\s"'<>]*\/ilan\/[^\s"'<>]*/g;
  const matches = bodyText.match(urlRegex);
  if (matches) {
    console.log('[URL Extractor] Method 6 - regex matches:', matches.length);
    matches.forEach(url => {
      if (url.includes('sahibinden.com')) {
        urls.add(cleanUrl(url));
      }
    });
  }
  
  const finalUrls = Array.from(urls).sort();
  console.log('[URL Extractor] Toplam benzersiz URL:', finalUrls.length);
  
  return finalUrls;
}

function cleanUrl(url) {
  try {
    // Query parametrelerini ve fragment'ları kaldır
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Trailing slash'ı kaldır
    return cleanUrl.replace(/\/$/, '');
  } catch (error) {
    return url;
  }
}

// Sayfa yüklendiğinde log
console.log('[URL Extractor] Content script yüklendi - Sahibinden.com');