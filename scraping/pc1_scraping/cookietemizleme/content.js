// Content Script - Web page ile Background Script arasında köprü
console.log('🔗 Cookie temizleyici content script yüklendi - ' + window.location.href);

// Test mesajı - sayfa yüklendiğinde
setTimeout(() => {
    console.log('🧪 Content script test - sayfa yüklendi');
}, 2000);

// Web sayfasından gelen mesajları dinle
window.addEventListener('message', function(event) {
    // Sadece aynı origin'den mesajları kabul et
    if (event.source != window) return;
    
    // Bot detection mesajı var mı?
    if (event.data.type && event.data.type === 'BOT_DETECTED') {
        console.log('🤖 Content script: Bot detection mesajı alındı');
        
        // Background script'e mesaj gönder
        chrome.runtime.sendMessage({
            action: 'botDetected'
        }, function(response) {
            if (response && response.success) {
                console.log('✅ Content script: Cookie temizleme başarılı');
            } else {
                console.log('❌ Content script: Cookie temizleme başarısız');
            }
        });
    }
}, false);