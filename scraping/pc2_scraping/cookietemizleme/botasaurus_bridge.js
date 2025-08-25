// Botasaurus Python Scraper Bridge
// Extension ile Python scraper arasında köprü

class BotasaurusBridge {
    constructor() {
        this.serverUrl = 'http://localhost:8080';
        this.isServerRunning = false;
        this.currentUrls = [];
    }

    // Server durumunu kontrol et
    async checkServerStatus() {
        try {
            console.log('🔍 Checking server status...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout
            
            const response = await fetch(`${this.serverUrl}/status`, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.isServerRunning = true;
                console.log('✅ Botasaurus server is running:', data);
                return data;
            } else {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            this.isServerRunning = false;
            console.log('❌ Botasaurus server check failed:', error.message);
            if (error.name === 'AbortError') {
                return { error: 'Server timeout (5 seconds)' };
            }
            return { error: error.message };
        }
    }

    // Python scraper'ı çalıştır
    async runBotasaurusScraper(urls) {
        try {
            if (!urls || urls.length === 0) {
                throw new Error('No URLs provided');
            }

            console.log(`🚀 Starting Botasaurus scraper for ${urls.length} URLs`);

            const response = await fetch(`${this.serverUrl}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    urls: urls
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Botasaurus scraper completed successfully');
                console.log(`📊 Processed ${result.urls_processed} URLs`);
            } else {
                console.error('❌ Botasaurus scraper failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('Botasaurus bridge error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Current URL'i scraper'a ekle
    addCurrentUrl() {
        const currentUrl = window.location.href;
        if (currentUrl.includes('sahibinden.com') && currentUrl.includes('/ilan/')) {
            if (!this.currentUrls.includes(currentUrl)) {
                this.currentUrls.push(currentUrl);
                console.log(`📋 Added URL to scraping list: ${currentUrl}`);
            }
        }
    }

    // Toplanan URL'leri scraper ile çalıştır
    async scrapeCollectedUrls() {
        if (this.currentUrls.length === 0) {
            console.log('📭 No URLs to scrape');
            return;
        }

        // Server durumunu kontrol et
        const serverStatus = await this.checkServerStatus();
        if (!this.isServerRunning) {
            console.error('❌ Cannot run scraper: server is not running');
            console.log('💡 Please start the server with: python scraper_server.py');
            return;
        }

        // Scraper'ı çalıştır
        const result = await this.runBotasaurusScraper([...this.currentUrls]);
        
        // Başarılı ise URL'leri temizle
        if (result.success) {
            this.currentUrls = [];
        }

        return result;
    }

    // Manuel URL ekleme
    addUrl(url) {
        if (url && !this.currentUrls.includes(url)) {
            this.currentUrls.push(url);
            console.log(`📋 Manually added URL: ${url}`);
        }
    }

    // URL listesini temizle
    clearUrls() {
        this.currentUrls = [];
        console.log('🗑️ URL list cleared');
    }

    // URL listesini al
    getUrls() {
        return [...this.currentUrls];
    }
}

// Global instance
window.botasaurusBridge = new BotasaurusBridge();

// Sayfa yüklendiğinde current URL'i ekle
if (window.location.href.includes('sahibinden.com')) {
    window.botasaurusBridge.addCurrentUrl();
}

console.log('🔗 Botasaurus Bridge loaded');