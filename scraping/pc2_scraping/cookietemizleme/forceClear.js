// Force Clear - cf_clearance'ı kesinlikle temizleyen fonksiyon

// TÜM cookie'leri getir ve cf_clearance'ı ara
function forceClearCfClearance() {
  console.log("=== FORCE CLEAR BAŞLADI ===");
  
  // 1. Tüm cookie'leri al
  chrome.cookies.getAll({}, (allCookies) => {
    console.log(`Toplam ${allCookies.length} cookie bulundu`);
    
    // cf_clearance'ı filtrele
    const cfCookies = allCookies.filter(c => 
      c.name === 'cf_clearance' || 
      c.name.includes('cf_') || 
      c.name === '__cf_bm'
    );
    
    console.log(`Cloudflare cookie sayısı: ${cfCookies.length}`);
    
    cfCookies.forEach(cookie => {
      console.log(`🔍 Bulundu: ${cookie.name} | Domain: ${cookie.domain} | Path: ${cookie.path} | HttpOnly: ${cookie.httpOnly} | Secure: ${cookie.secure}`);
    });
    
    // 2. Özellikle cf_clearance'ı ara
    chrome.cookies.getAll({name: 'cf_clearance'}, (cfClearanceCookies) => {
      console.log(`cf_clearance araması: ${cfClearanceCookies.length} adet bulundu`);
      
      cfClearanceCookies.forEach(cookie => {
        console.log(`🎯 cf_clearance detay:`);
        console.log(`  - Domain: ${cookie.domain}`);
        console.log(`  - Path: ${cookie.path}`);
        console.log(`  - Value: ${cookie.value.substring(0, 10)}...`);
        console.log(`  - HttpOnly: ${cookie.httpOnly}`);
        console.log(`  - Secure: ${cookie.secure}`);
        console.log(`  - SameSite: ${cookie.sameSite}`);
        
        // Farklı URL kombinasyonları dene
        const urlCombinations = [
          `https://${cookie.domain}${cookie.path}`,
          `http://${cookie.domain}${cookie.path}`,
          `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
          `http://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
          `https://www.${cookie.domain.replace(/^\./, '')}${cookie.path}`,
          `http://www.${cookie.domain.replace(/^\./, '')}${cookie.path}`,
          'https://sahibinden.com/',
          'http://sahibinden.com/',
          'https://www.sahibinden.com/',
          'http://www.sahibinden.com/'
        ];
        
        console.log('URL kombinasyonları deneniyor...');
        let removed = false;
        
        urlCombinations.forEach((url, index) => {
          chrome.cookies.remove({
            url: url,
            name: 'cf_clearance'
          }, (details) => {
            if (details) {
              console.log(`✅ BAŞARILI! URL #${index}: ${url}`);
              removed = true;
            }
          });
        });
        
        if (!removed) {
          console.log('❌ cf_clearance silinemedi!');
        }
      });
    });
    
    // 3. Sahibinden domain'indeki TÜM cookie'leri listele
    const sahibindenCookies = allCookies.filter(c => 
      c.domain.includes('sahibinden')
    );
    
    console.log(`\n=== SAHIBINDEN COOKIES (${sahibindenCookies.length}) ===`);
    sahibindenCookies.forEach(cookie => {
      console.log(`${cookie.name} | ${cookie.domain} | HttpOnly: ${cookie.httpOnly}`);
      
      // cf_clearance varsa özel işlem
      if (cookie.name === 'cf_clearance') {
        console.log('🚨 cf_clearance BULUNDU! Silme işlemi başlatılıyor...');
        
        // Direkt domain ve path ile sil
        const directUrl = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
        
        chrome.cookies.remove({
          url: directUrl,
          name: 'cf_clearance'
        }, (result) => {
          if (result) {
            console.log('✅ cf_clearance SİLİNDİ!');
          } else {
            console.log('❌ cf_clearance SİLİNEMEDİ! Chrome API hatası.');
            
            // Alternatif: Cookie'yi expire et
            chrome.cookies.set({
              url: directUrl,
              name: 'cf_clearance',
              value: '',
              expirationDate: 0
            }, () => {
              console.log('🔄 cf_clearance expire edilmeye çalışıldı');
            });
          }
        });
      }
    });
  });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = forceClearCfClearance;
}