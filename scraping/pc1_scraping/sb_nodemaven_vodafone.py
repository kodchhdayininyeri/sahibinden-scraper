"""
NodeMaven Auto-Restart Scraper - Her 5 URL'de yeni IP
NodeMaven proxy ile otomatik restart
"""

from seleniumbase import SB
import json
import random
import time
from datetime import datetime
import subprocess
import os

class AutoRestartScraper:
    def __init__(self):
        self.all_results = []
        # NodeMaven ROTATING proxy formatı - SeleniumBase format
        self.proxy = "YOUR_NODEMAVEN_USERNAME:YOUR_NODEMAVEN_PASSWORD@gate.nodemaven.com:8080"
        self.batch_size = 5  # 5 URL paralel açılacak
        self.bot_detect_count = 0
        self.one_shot_used = {}  # Her URL için tek seferlik temizleme takibi
        
        # User-Agent rotation
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        
    def handle_bot_detection(self, sb, url, batch_num):
        """ONE-SHOT Bot detection handler - her URL için sadece 1 kez"""
        url_key = url[:50]  # URL'nin ilk 50 karakteri
        
        # Bu URL için daha önce temizleme yapıldı mı?
        if url_key in self.one_shot_used:
            print(f"[[WARNING] SKIP] Bu URL için zaten ONE-SHOT temizleme yapıldı")
            return False
            
        try:
            self.bot_detect_count += 1
            print(f"[ ONE-SHOT #{self.bot_detect_count}] Bot detect! TEK ATIŞ temizleme...")
            
            # Extension cookie temizleme tetikleniyor...
            print("[CLEANUP] Extension cookie temizleme tetikleniyor...")
            try:
                # Cookie'leri kontrol et - temizleme öncesi
                cookies_before = sb.driver.get_cookies()
                cf_before = [c for c in cookies_before if c['name'] == 'cf_clearance']
                print(f"[COOKIES BEFORE] Total: {len(cookies_before)}, cf_clearance: {len(cf_before)}")
                
                # Yöntem 1: Content script'e mesaj gönder
                try:
                    sb.execute_script("""
                        window.postMessage({
                            type: 'BOT_DETECTED',
                            source: 'seleniumbase-scraper'
                        }, '*');
                        console.log(' Bot detection mesajı gönderildi');
                    """)
                    print("[METHOD 1] window.postMessage ile mesaj gönderildi")
                except:
                    pass
                
                # Yöntem 2: JavaScript ile cookie temizle (fallback)
                sb.sleep(2)
                cookies_mid = sb.driver.get_cookies()
                if len(cookies_mid) >= len(cookies_before):
                    print("[METHOD 2] JavaScript ile manuel temizleme...")
                    sb.execute_script("""
                        // Tüm cookie'leri temizle
                        document.cookie.split(";").forEach(function(c) { 
                            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.sahibinden.com"); 
                            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=sahibinden.com"); 
                            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                        });
                        localStorage.clear();
                        sessionStorage.clear();
                        console.log(' JavaScript cookie temizleme yapıldı');
                    """)
                
                # 3 saniye bekle
                sb.sleep(3)
                
                # Cookie'leri tekrar kontrol et - temizleme sonrası
                cookies_after = sb.driver.get_cookies()
                cf_after = [c for c in cookies_after if c['name'] == 'cf_clearance']
                print(f"[COOKIES AFTER] Total: {len(cookies_after)}, cf_clearance: {len(cf_after)}")
                
                if len(cookies_after) < len(cookies_before):
                    print(f"[CLEANUP SUCCESS] {len(cookies_before) - len(cookies_after)} cookies deleted!")
                else:
                    print(f"[[WARNING] CLEANUP PARTIAL] Some cookies remain")
                    
            except Exception as e:
                print(f"[CLEANUP ERROR] {e}")
            
            # Kısa bekleme
            print("[WAIT] 3s after ONE-SHOT cleanup...")
            sb.sleep(3)
            
            # Sayfayı yenile
            print(f"[REFRESH] Refreshing after ONE-SHOT...")
            sb.refresh()
            sb.sleep(5)
            
            # Bu URL için temizleme yapıldı olarak işaretle
            self.one_shot_used[url_key] = True
            
            print("[ONE-SHOT] Cleanup completed! Won't clean this URL again.")
            return True
            
        except Exception as e:
            print(f"[ONE-SHOT ERROR] {e}")
            return False
        
    def inject_data_collector(self, sb):
        """HTML analizi ile optimize edilmiş veri toplama scripti"""
        return sb.execute_script("""
            // HTML'den tespit edilmiş optimized veri toplama fonksiyonu
            window.collectPageData = function() {
                const data = {
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    collected: false,
                    error: null
                };
                
                try {
                    // Title - HTML'de doğrulandı: .classifiedDetailTitle h1
                    const titleSelectors = [
                        '.classifiedDetailTitle h1',
                        '.classifiedDetailTitle',
                        'h1'
                    ];
                    for (let selector of titleSelectors) {
                        const elem = document.querySelector(selector);
                        if (elem && elem.textContent.trim()) {
                            data.title = elem.textContent.trim();
                            break;
                        }
                    }
                    
                    // Price - HTML'de doğrulandı: .classified-price-wrapper
                    const priceElem = document.querySelector('.classified-price-wrapper');
                    if (priceElem) {
                        const priceText = priceElem.textContent.trim();
                        // Temiz fiyat: sadece rakam ve TL
                        const priceMatch = priceText.match(/[\\d.,]+\\s*TL/);
                        if (priceMatch) {
                            data.price = priceMatch[0];
                        }
                    }
                    
                    // İlan No - HTML'de doğrulandı: .classifiedId
                    const ilanElem = document.querySelector('.classifiedId');
                    if (ilanElem) {
                        data.ilan_no = ilanElem.textContent.trim();
                    }
                    
                    // Location - HTML'de doğrulandı: .classifiedInfo h2 a
                    const locationContainer = document.querySelector('.classifiedInfo h2');
                    if (locationContainer) {
                        const links = locationContainer.querySelectorAll('a');
                        if (links.length > 0) {
                            const locations = Array.from(links).map(l => l.textContent.trim()).filter(l => l);
                            data.location = locations.join(' / ');
                        }
                    }
                    
                    // Specs - HTML'de doğrulandı: pageTrackData.customVars
                    if (typeof pageTrackData !== 'undefined' && pageTrackData.customVars) {
                        data.specs = {};
                        
                        // HTML'de görülen tüm araç özellikleri
                        const carSpecs = [
                            'Marka', 'Seri', 'Model', 'Yıl', 'Yakıt Tipi', 
                            'Vites', 'KM', 'Motor Gücü', 'Renk', 'Kimden',
                            'Kasa Tipi', 'Motor Hacmi', 'Çekiş', 'Garanti',
                            'Ağır Hasar Kayıtlı', 'Plaka / Uyruk', 'Takas',
                            'vehicleCondition', 'İlan Tarihi'
                        ];
                        
                        pageTrackData.customVars.forEach(item => {
                            if (item.name && item.value && carSpecs.includes(item.name)) {
                                data.specs[item.name] = item.value.toString();
                            }
                        });
                        
                        // Location bilgilerini de al
                        ['loc1', 'loc2', 'loc3', 'loc4', 'loc5'].forEach(locKey => {
                            const locItem = pageTrackData.customVars.find(v => v.name === locKey);
                            if (locItem && locItem.value) {
                                data.specs[locKey] = locItem.value.toString();
                            }
                        });
                    }
                    
                    // Paint/Damage - audi_botasaurus_scraper.py'den alınmış optimized kod
                    try {
                        data.paint_damage = {
                            painted_parts: [],
                            changed_parts: [],
                            damage_areas: {}
                        };
                        
                        // Method 1: Extract from car-damage-info-list
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
                                        data.paint_damage.painted_parts.push(text);
                                    } else if (currentSection === 'changed') {
                                        data.paint_damage.changed_parts.push(text);
                                    }
                                }
                            });
                        }
                        
                        // Method 2: Extract from car-parts visual diagram
                        const carParts = document.querySelectorAll('.car-parts > div');
                        carParts.forEach(part => {
                            const classes = part.className || '';
                            let partName = null;
                            let status = null;
                            
                            // Extract part name from class
                            const classArray = classes.split(' ');
                            for (let cls of classArray) {
                                if (cls.includes('bumper') || cls.includes('hood') || cls.includes('roof') || 
                                    cls.includes('door') || cls.includes('mudguard')) {
                                    partName = cls.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                                    break;
                                }
                            }
                            
                            // Extract status from class
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
                                data.paint_damage.damage_areas[partName] = status;
                            }
                        });
                        
                    } catch (e) {
                        console.log('Paint/Damage extraction error:', e);
                    }
                    
                    // Features - audi_botasaurus_scraper.py'den alınmış optimized kod
                    try {
                        data.features = {
                            guvenlik: [],
                            ic_donanim: [], 
                            dis_donanim: [],
                            multimedya: []
                        };
                        
                        // Method 1: Extract from H3 + UL structure (main features section)
                        const h3Elements = document.querySelectorAll('h3');
                        
                        h3Elements.forEach(h3 => {
                            const sectionTitle = h3.textContent.trim();
                            let targetArray = null;
                            
                            // Determine which section this is
                            if (sectionTitle === 'Güvenlik') {
                                targetArray = data.features.guvenlik;
                            } else if (sectionTitle === 'İç Donanım') {
                                targetArray = data.features.ic_donanim;
                            } else if (sectionTitle === 'Dış Donanım') {
                                targetArray = data.features.dis_donanim;
                            } else if (sectionTitle === 'Multimedya') {
                                targetArray = data.features.multimedya;
                            }
                            
                            // If this is a car features section, extract the UL that follows
                            if (targetArray) {
                                let nextUL = h3.nextElementSibling;
                                while (nextUL && nextUL.tagName !== 'UL' && nextUL.nextElementSibling) {
                                    nextUL = nextUL.nextElementSibling;
                                }
                                
                                if (nextUL && nextUL.tagName === 'UL') {
                                    const lis = nextUL.querySelectorAll('li');
                                    
                                    lis.forEach(li => {
                                        let text = li.textContent.trim();
                                        
                                        // Clean up text - remove tooltip content
                                        text = text.replace(/Oto Sözlük'te Detaylı Oku/g, '').trim();
                                        
                                        // Skip if empty or contains navigation text
                                        if (!text || text.length < 3) return;
                                        if (text.includes('Mağaza') || text.includes('Sahibinden') || text.includes('İşlemlerim')) return;
                                        
                                        const isChecked = li.classList.contains('selected');
                                        
                                        targetArray.push({
                                            name: text,
                                            checked: isChecked
                                        });
                                    });
                                }
                            }
                        });
                        
                        // Method 2: Extract from table structure (backup/additional info)
                        const tables = document.querySelectorAll('table');
                        tables.forEach(table => {
                            const rows = table.querySelectorAll('tr');
                            let currentTableSection = null;
                            
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                
                                if (cells.length >= 1) {
                                    const firstCell = cells[0];
                                    const cellText = firstCell.textContent.trim();
                                    
                                    // Check if this is a section header
                                    if (cellText.includes('Güvenlik')) {
                                        currentTableSection = 'guvenlik';
                                        return;
                                    } else if (cellText.includes('İç Donanım')) {
                                        currentTableSection = 'ic_donanim';
                                        return;
                                    } else if (cellText.includes('Dış Donanım')) {
                                        currentTableSection = 'dis_donanim';
                                        return;
                                    } else if (cellText.includes('Multimedya')) {
                                        currentTableSection = 'multimedya';
                                        return;
                                    }
                                    
                                    // Check if this is a feature row
                                    if (currentTableSection && cellText && cellText.length > 3) {
                                        // Skip if already exists
                                        const targetArray = data.features[currentTableSection];
                                        const exists = targetArray.some(item => item.name === cellText);
                                        
                                        if (!exists) {
                                            // Check if feature is checked (has checkmark class in second cell)
                                            let isChecked = false;
                                            if (cells.length >= 2) {
                                                const secondCell = cells[1];
                                                isChecked = secondCell.classList.contains('checkmark') || 
                                                           secondCell.querySelector('.checkmark') !== null;
                                            }
                                            
                                            targetArray.push({
                                                name: cellText,
                                                checked: isChecked
                                            });
                                        }
                                    }
                                }
                            });
                        });
                        
                    } catch (e) {
                        console.log('Features extraction error:', e);
                    }
                    
                    // Page status
                    data.pageReady = document.readyState === 'complete';
                    data.hasCloudflare = document.title.toLowerCase().includes('just a moment') ||
                                        document.title.toLowerCase().includes('dakika');
                    data.hasLogin = document.title.toLowerCase().includes('login');
                    
                    data.collected = true;
                    
                } catch (error) {
                    data.error = error.toString();
                }
                
                // Veriyi window objesine kaydet
                window.__collectedData = data;
                return data;
            };
            
            // Optimized loading strategy
            if (document.readyState === 'complete') {
                // Sayfa hazır, hemen topla
                setTimeout(window.collectPageData, 500);
            } else {
                // Sayfa yüklenirken bekle
                window.addEventListener('load', function() {
                    setTimeout(window.collectPageData, 1500);
                });
            }
            
            // Daha az sıklıkla kontrol et (performans için)
            let checkCount = 0;
            const checker = setInterval(function() {
                checkCount++;
                if (!window.__collectedData || !window.__collectedData.collected) {
                    window.collectPageData();
                }
                
                // 15 saniye sonra interval'i durdur
                if (checkCount >= 7) {
                    clearInterval(checker);
                }
            }, 2000);
            
            return 'Optimized data collector injected';
        """)
    
    def scrape_batch(self, urls_batch, batch_num):
        """5 URL'lik batch'i gerçek paralel scrape et - JavaScript ile arka planda"""
        print(f"\n{'='*70}")
        print(f"BATCH {batch_num} - TRUE PARALLEL (JAVASCRIPT)")
        print(f"URLs: {len(urls_batch)} | Total Processed: {(batch_num-1)*5}")
        print(f"{'='*70}")
        
        print("JAVASCRIPT ile arka planda veri toplama")
        print("Sekmeler arası geçiş YOK!")
        print(f"{'='*70}\n")
        
        batch_results = []
        
        # SeleniumBase extension yükleme
        extension_path = r"C:\Users\emirh\cookietemizleme"
        
        with SB(uc=True, test=True, proxy=self.proxy, headless=False,
               extension_dir=extension_path) as sb:
            print(f"[BATCH {batch_num}] NODEMAVEN Mobile proxy connected!")
            
            # IP kontrolü
            try:
                sb.open("https://httpbin.org/ip")
                sb.sleep(2)
                ip_info = sb.get_text("body")
                print(f"[IP] Batch {batch_num}: {ip_info[:50]}...")
            except:
                print(f"[IP] Check failed")
            
            # Homepage ve Cloudflare çözümü (GÜVENLİ YÖNTEM)
            print("\n[WARMUP] Ana sayfa aciliyor...")
            sb.open("https://www.sahibinden.com")
            sb.sleep(8)
            
            # Cloudflare kontrolü
            title = sb.get_title().lower()
            if "just a moment" in title or "dakika" in title:
                print("[CLOUDFLARE] Challenge detected, waiting...")
                sb.sleep(15)
            print("[WARMUP] Cloudflare cozuldu!")
            
            # SIRA İLE AÇMA STRATEJİSİ!
            print("\n[SEQUENTIAL] İlk URL'i test edip, başarılıysa diğerlerini sırayla açıyoruz...")
            tab_info = []
            
            # İLK URL'İ TEST ET
            print(f"\n[TEST TAB 0] İlk URL test ediliyor: {urls_batch[0][:70]}...")
            sb.open(urls_batch[0])
            sb.sleep(3)
            
            # İlk URL'de test yap - Cloudflare/Bot Detection kontrolü
            first_url_status = sb.execute_script("""
                // Cloudflare kontrolü
                if (document.title.toLowerCase().includes('just a moment') || 
                    document.title.toLowerCase().includes('dakika')) {
                    return {status: 'cloudflare', title: document.title};
                }
                
                // Bot detection kontrolü
                const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
                const titleText = document.title.toLowerCase();
                
                if (bodyText.includes('robot olmadığınızı') || 
                    bodyText.includes('olağan dışı erişim') ||
                    bodyText.includes('olagan disi erisim') ||
                    bodyText.includes('erişim engellendi') ||
                    bodyText.includes('erisim engellendi') ||
                    bodyText.includes('checking your browser') ||
                    bodyText.includes('destek kodu') ||
                    bodyText.includes('otomatik) erişim yapılmaya') ||
                    bodyText.includes('talebinizi gerçekleştiremiyoruz') ||
                    titleText.includes('user login') ||
                    bodyText.includes('in order to provide you a better experience')) {
                    return {status: 'bot_detected', title: document.title, body: bodyText.substring(0, 200)};
                }
                
                return {status: 'ok', title: document.title};
            """)
            
            print(f"[TEST RESULT] Status: {first_url_status.get('status')}")
            print(f"[TEST RESULT] Title: {first_url_status.get('title', '')[:60]}...")
            
            # Cloudflare varsa bekle
            if first_url_status.get('status') == 'cloudflare':
                print("[CLOUDFLARE] İlk URL'de Cloudflare tespit edildi, 15s bekleniyor...")
                sb.sleep(15)
                print("[CLOUDFLARE] Çözüldü, devam ediliyor...")
            
            # Bot detection varsa temizle
            elif first_url_status.get('status') == 'bot_detected':
                print("[BOT DETECTED] İlk URL'de bot detection! Cookie temizleme başlatılıyor...")
                
                # Cookie temizleme
                try:
                    sb.execute_script("""
                        window.postMessage({
                            type: 'BOT_DETECTED',
                            source: 'seleniumbase-scraper'
                        }, '*');
                    """)
                    print("[ BOT] Extension'a mesaj gönderildi")
                except:
                    pass
                
                # Manuel temizleme
                sb.execute_script("""
                    document.cookie.split(";").forEach(function(c) { 
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.sahibinden.com"); 
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=sahibinden.com"); 
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                    });
                    localStorage.clear();
                    sessionStorage.clear();
                """)
                
                print("[ BOT] Cookies temizlendi, sayfa yenileniyor...")
                sb.refresh()
                sb.sleep(8)
                print("[ BOT] Temizleme tamamlandı!")
            
            # İlk URL başarılı, data collector enjekte et
            print("[INJECT TAB 0] İlk URL'e data collector enjekte ediliyor...")
            self.inject_data_collector(sb)
            
            current_url = sb.get_current_url()
            main_handle = sb.driver.current_window_handle
            tab_info.append({
                'index': 0,
                'url': current_url,
                'handle': main_handle,
                'batch': batch_num
            })
            print("[ TAB 0] İlk URL hazır!")
            
            # DİĞER 4 URL'İ SIRAYLA AÇ (1'er saniye arayla)
            print(f"\n[SEQUENTIAL] Diğer {len(urls_batch)-1} URL sırayla açılıyor...")
            for i in range(1, len(urls_batch)):
                print(f"[OPEN TAB {i}] {urls_batch[i][:70]}...")
                sb.execute_script(f"window.open('{urls_batch[i]}', '_blank_{i}');")
                delay = random.uniform(1.5, 2.5)  # 1.5-2.5 saniye random gecikme
                time.sleep(delay)
                print(f"[OK TAB {i}] Açıldı, {delay:.1f}s beklendi...")
            
            print(f"\n[SEQUENTIAL] Tüm {len(urls_batch)} sekme açıldı! Yüklenme bekleniyor...")
            time.sleep(5)  # Tüm sekmeler yüklensin
            
            # Diğer sekmelere data collector enjekte et
            print("[INJECT] Diğer sekmelere data collector enjekte ediliyor...")
            all_handles = sb.driver.window_handles
            
            for i, handle in enumerate(all_handles[1:], 1):  # İlk handle'ı atla
                sb.switch_to_window(handle)
                
                # JavaScript veri toplayıcıyı enjekte et
                self.inject_data_collector(sb)
                
                # URL'i al
                current_url = sb.get_current_url()
                
                tab_info.append({
                    'index': i,
                    'url': current_url,
                    'handle': handle,
                    'batch': batch_num
                })
                
                print(f"   Tab {i}: Collector enjekte edildi")
            
            # İlk sekmeye geri dön
            sb.switch_to_window(tab_info[0]['handle'])
            
            # Arka planda veri toplanmasını bekle - HTML optimizasyonu ile kısaltıldı
            wait_time = 12
            print(f"\n[WAIT] {wait_time} saniye bekleniyor (HTML optimized - daha hızlı)...")
            
            for i in range(wait_time):
                time.sleep(1)
                if i % 3 == 0:
                    try:
                        # İlk sekmede biraz scroll (doğal görünsün)
                        sb.execute_script("window.scrollBy(0, 100);")
                    except:
                        pass
                print(f"   {i+1}/{wait_time}s...", end='\r')
            
            print(f"\n[COLLECT] Veriler toplaniyor...")
            
            # Her sekmeden veriyi al
            for tab in tab_info:
                sb.switch_to_window(tab['handle'])
                time.sleep(0.5)
                
                try:
                    # JavaScript'ten topladığı veriyi al - Cloudflare ve Bot Detection kontrolü ile
                    collected_data = sb.execute_script("""
                        // Cloudflare kontrolü
                        if (document.title.toLowerCase().includes('just a moment') || 
                            document.title.toLowerCase().includes('dakika')) {
                            return {cloudflare_detected: true};
                        }
                        
                        // Bot detection kontrolü - Sahibinden'in kendi mesajları
                        const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
                        const titleText = document.title.toLowerCase();
                        
                        if (bodyText.includes('robot olmadığınızı') || 
                            bodyText.includes('olağan dışı erişim') ||
                            bodyText.includes('olagan disi erisim') ||
                            bodyText.includes('erişim engellendi') ||
                            bodyText.includes('erisim engellendi') ||
                            bodyText.includes('checking your browser') ||
                            bodyText.includes('destek kodu') ||
                            bodyText.includes('otomatik) erişim yapılmaya') ||
                            bodyText.includes('talebinizi gerçekleştiremiyoruz') ||
                            titleText.includes('user login') ||
                            bodyText.includes('in order to provide you a better experience')) {
                            return {bot_detected: true};
                        }
                        
                        // Eğer veri henüz toplanmadıysa şimdi topla
                        if (!window.__collectedData) {
                            window.collectPageData();
                        }
                        return window.__collectedData;
                    """)
                    
                    # Cloudflare tespit edildi mi?
                    if collected_data and collected_data.get('cloudflare_detected'):
                        print(f"   Tab {tab['index']}: Cloudflare detected, waiting 10s...")
                        sb.sleep(10)
                    
                    # Bot detection tespit edildi mi?
                    elif collected_data and collected_data.get('bot_detected'):
                        print(f"   Tab {tab['index']}:  BOT DETECTED! Olağan dışı erişim tespit edildi!")
                        print(f"   Tab {tab['index']}: Cookie temizleme başlatılıyor...")
                        
                        # Cookie temizleme extension'ı tetikle
                        try:
                            sb.execute_script("""
                                window.postMessage({
                                    type: 'BOT_DETECTED',
                                    source: 'seleniumbase-scraper'
                                }, '*');
                                console.log(' Bot detection mesajı gönderildi');
                            """)
                            print(f"   Tab {tab['index']}: Extension'a mesaj gönderildi")
                        except:
                            pass
                        
                        # Manuel cookie temizleme (fallback)
                        sb.execute_script("""
                            // Tüm cookie'leri temizle
                            document.cookie.split(";").forEach(function(c) { 
                                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.sahibinden.com"); 
                                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=sahibinden.com"); 
                                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                            });
                            localStorage.clear();
                            sessionStorage.clear();
                            console.log(' JavaScript cookie temizleme yapıldı');
                        """)
                        
                        print(f"   Tab {tab['index']}: Cookies temizlendi, 5s bekleniyor...")
                        sb.sleep(5)
                        
                        # Sayfayı yenile
                        sb.refresh()
                        sb.sleep(8)
                        
                        # Tekrar veri toplamayı dene
                        collected_data = sb.execute_script("""
                            // Tekrar data collector enjekte et
                            if (typeof window.collectPageData === 'undefined') {
                                // Re-inject the collector function
                                window.collectPageData = function() {
                                    const data = {
                                        url: window.location.href,
                                        timestamp: new Date().toISOString(),
                                        collected: false,
                                        error: null
                                    };
                                    
                                    try {
                                        // Title
                                        const titleElem = document.querySelector('.classifiedDetailTitle h1, h1');
                                        if (titleElem) data.title = titleElem.textContent.trim();
                                        
                                        // Price
                                        const priceElem = document.querySelector('.classified-price-wrapper');
                                        if (priceElem) {
                                            const priceMatch = priceElem.textContent.match(/[\\d.,]+\\s*TL/);
                                            if (priceMatch) data.price = priceMatch[0];
                                        }
                                        
                                        // Specs
                                        if (typeof pageTrackData !== 'undefined' && pageTrackData.customVars) {
                                            data.specs = {};
                                            pageTrackData.customVars.forEach(item => {
                                                if (item.name && item.value) {
                                                    data.specs[item.name] = item.value.toString();
                                                }
                                            });
                                        }
                                        
                                        data.collected = true;
                                    } catch (error) {
                                        data.error = error.toString();
                                    }
                                    
                                    window.__collectedData = data;
                                    return data;
                                };
                            }
                            
                            // Veri topla
                            window.collectPageData();
                            return window.__collectedData;
                        """)
                    
                    if collected_data and not collected_data.get('cloudflare_detected'):
                        # Batch ve success bilgisi ekle
                        collected_data['batch'] = batch_num
                        collected_data['tab_index'] = tab['index']
                        collected_data['proxy_type'] = 'nodemaven_mobile_parallel'
                        
                        # Success kontrolü
                        if collected_data.get('title') and (collected_data.get('price') or collected_data.get('specs')):
                            collected_data['success'] = True
                            print(f"   SUCCESS Tab {tab['index']}: {collected_data.get('title', '')[:50]}...")
                        else:
                            collected_data['success'] = False
                            print(f"   ERROR Tab {tab['index']}: Veri eksik")
                        
                        batch_results.append(collected_data)
                    else:
                        print(f"   [WARNING] Tab {tab['index']}: Veri toplanamadı")
                        batch_results.append({
                            'url': tab['url'],
                            'success': False,
                            'error': 'No data collected',
                            'batch': batch_num,
                            'tab_index': tab['index']
                        })
                        
                except Exception as e:
                    print(f"   ERROR Tab {tab['index']}: Error - {str(e)[:50]}")
                    batch_results.append({
                        'url': tab['url'],
                        'success': False,
                        'error': str(e),
                        'batch': batch_num,
                        'tab_index': tab['index']
                    })
        
        print(f"\n[BATCH {batch_num} COMPLETE] Processed {len(batch_results)} URLs")
        return batch_results
    
    def process_all_urls(self, all_urls, max_urls=None):
        """Tüm URL'leri batch'ler halinde işle"""
        if max_urls:
            all_urls = all_urls[:max_urls]
        
        print(f"\n{'='*80}")
        print(f"NODEMAVEN AUTO-RESTART SCRAPER")
        print(f"Total URLs: {len(all_urls)} | Batch Size: {self.batch_size}")
        print(f"Strategy: New IP every {self.batch_size} URLs")
        print(f"{'='*80}\n")
        
        # Batch'lere böl
        batches = []
        for i in range(0, len(all_urls), self.batch_size):
            batch = all_urls[i:i + self.batch_size]
            batches.append(batch)
        
        print(f"Created {len(batches)} batches of {self.batch_size} URLs each\n")
        
        # Her batch'i işle
        for batch_num, batch_urls in enumerate(batches, 1):
            print(f"\nSTARTING BATCH {batch_num}/{len(batches)}")
            print(f"URLs in this batch: {len(batch_urls)}")
            
            try:
                batch_results = self.scrape_batch(batch_urls, batch_num)
                self.all_results.extend(batch_results)
                
                # Batch özeti
                successful = [r for r in batch_results if r.get('success')]
                print(f"[BATCH {batch_num} SUMMARY] {len(successful)}/{len(batch_results)} successful")
                
                # Son batch değilse restart beklemesi
                if batch_num < len(batches):
                    restart_delay = random.uniform(5, 10)
                    print(f"\nRESTARTING for new IP in {restart_delay:.1f}s...")
                    time.sleep(restart_delay)
                
            except Exception as e:
                print(f"[BATCH {batch_num} ERROR] {e}")
                # Batch başarısız olsa da devam et
                continue
        
        return self.all_results
    
    def save_results(self, filename=None):
        """Sonuçları kaydet"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"nodemaven_results_{timestamp}.json"
        
        # Özet istatistikler
        total = len(self.all_results)
        successful = [r for r in self.all_results if r.get('success')]
        failed = [r for r in self.all_results if not r.get('success')]
        
        # Batch'lere göre başarı oranları
        batch_stats = {}
        for result in self.all_results:
            batch_num = result.get('batch', 0)
            if batch_num not in batch_stats:
                batch_stats[batch_num] = {'total': 0, 'success': 0}
            batch_stats[batch_num]['total'] += 1
            if result.get('success'):
                batch_stats[batch_num]['success'] += 1
        
        # Dosyaya kaydet
        final_data = {
            'summary': {
                'total_urls': total,
                'successful': len(successful),
                'failed': len(failed),
                'success_rate': f"{len(successful)/total*100:.1f}%" if total > 0 else "0%",
                'batch_size': self.batch_size,
                'total_batches': len(batch_stats),
                'proxy_type': 'NodeMaven Turkish Mobile'
            },
            'batch_stats': batch_stats,
            'results': self.all_results
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n{'='*80}")
        print(f"FINAL RESULTS SAVED: {filename}")
        print(f"Total URLs: {total}")
        if total > 0:
            print(f"Successful: {len(successful)} ({len(successful)/total*100:.1f}%)")
            print(f"Failed: {len(failed)} ({len(failed)/total*100:.1f}%)")
        else:
            print(f"Successful: 0 (0.0%)")
            print(f"Failed: 0 (0.0%)")
        print(f"Batches: {len(batch_stats)} (5 URLs each)")
        print(f"{'='*80}")
        
        return filename

def load_urls(count=5, random_select=True, mercedes=False):
    """URL'leri yükle - Mercedes veya BMW dosyasından"""
    if mercedes:
        # Mercedes CLA data - NodeMaven PC1 range: 184-276
        url_file = r"C:\Users\emirh\Downloads\mercedes_cla_data.txt"
        start_idx = 184
        end_idx = 276
    else:
        url_file = r"C:\Users\emirh\Downloads\sahibinden_urls_ALL_2025-08-13T06-41-14-675Z.txt"
        start_idx = None
        end_idx = None
    
    try:
        with open(url_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # URL parsing - handle different line endings
        urls = content.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        
        # Valid URL'leri filtrele
        valid_urls = []
        for url in urls:
            url = url.strip()
            if url.startswith('https://'):
                valid_urls.append(url)
        
        # Mercedes için range uygula
        if mercedes and start_idx is not None and end_idx is not None:
            valid_urls = valid_urls[start_idx:end_idx]
            print(f"[MERCEDES] Using NodeMaven PC1 range: {start_idx}-{end_idx-1} ({len(valid_urls)} URLs)")
        
        if random_select and len(valid_urls) > count:
            # RASTGELE SEÇ
            import random
            test_urls = random.sample(valid_urls, count)
            print(f"Loaded {len(test_urls)} RANDOM URLs from {len(valid_urls)} total")
        else:
            # İLK N TANESİNİ AL
            test_urls = valid_urls[:count]
            print(f"Loaded {len(test_urls)} URLs from {len(valid_urls)} total")
        
        # Fallback URLs if loading fails - BMW URLs from new file
        if len(test_urls) < count:
            print("Using fallback BMW URLs...")
            fallback_urls = [
                "https://www.sahibinden.com/ilan/vasita-otomobil-bmw-1-degisen-2-boya-harici-hatasiz-boyasiz-9-trmr-koltuk-istma-1264521483/detay",
                "https://www.sahibinden.com/ilan/vasita-otomobil-bmw-2008-bmw-3.20-dizel-coupe-sunrooflu-sorunsuz-1239812351/detay",
                "https://www.sahibinden.com/ilan/vasita-otomobil-bmw-2010-3.20d-msport-cabrio-sineklik-plusk.ayna-plusk.isitma-masrafsiz-1261552244/detay"
            ]
            test_urls = fallback_urls[:count]
            print(f"Using {len(test_urls)} BMW fallback URLs")
        
        return test_urls
        
    except Exception as e:
        print(f"URL loading error: {e}")
        return []

def mercedes_continuous_scraping():
    """Mercedes CLA Continuous Scraping - NodeMaven range: 184-275"""
    print("[MERCEDES] CLA CONTINUOUS SCRAPING - NODEMAVEN")
    print("="*60)
    
    # YENI AUDI URLs - 13k URL dosyası
    MERCEDES_FILE = r"C:\Users\emirh\Downloads\sahibinden_urls_ALL_2025-08-20T19-31-32-806Z.txt"
    NODEMAVEN_START = 480  # 480'den başla
    NODEMAVEN_END = 560   # 480-559 arası 80 URL çek
    BATCH_SIZE = 5
    
    # Load all Mercedes URLs
    try:
        with open(MERCEDES_FILE, 'r', encoding='utf-8') as f:
            all_urls = [line.strip() for line in f if line.strip()]
        
        nodemaven_urls = all_urls[NODEMAVEN_START:NODEMAVEN_END]
        print(f"[RANGE] NodeMaven URLs: {NODEMAVEN_START}-{NODEMAVEN_END-1} ({len(nodemaven_urls)} total)")
        
    except Exception as e:
        print(f"[ERROR] Failed to load Mercedes data: {e}")
        return
    
    # Scraper oluştur
    scraper = AutoRestartScraper()
    
    # Continuous processing
    current_index = 0
    batch_number = 1
    total_processed = 0
    
    print(f"[START] Processing {len(nodemaven_urls)} URLs in batches of {BATCH_SIZE}")
    print("="*60)
    
    while current_index < len(nodemaven_urls):
        # Get next batch
        end_index = min(current_index + BATCH_SIZE, len(nodemaven_urls))
        batch_urls = nodemaven_urls[current_index:end_index]
        
        print(f"\n[BATCH {batch_number}]")
        print(f"   URLs: {current_index+NODEMAVEN_START}-{end_index+NODEMAVEN_START-1} ({len(batch_urls)} URLs)")
        print(f"   Progress: {end_index}/{len(nodemaven_urls)} URLs ({end_index/len(nodemaven_urls)*100:.1f}%)")
        
        # Process batch - Sadece bu batch'i işle
        scraper.all_results = []  # Önceki sonuçları temizle!
        batch_results = scraper.process_all_urls(batch_urls)
        
        # Save to database - Sadece bu batch'in verilerini kaydet
        try:
            from db_manager_postgresql import SahibindenDB
            db = SahibindenDB()
            
            cars_data = []
            # Sadece bu batch'in başarılı sonuçlarını al
            successful_results = [r for r in batch_results if r.get('success')]
            for result in successful_results:
                car_data = db.extract_car_data(result)
                cars_data.append(car_data)
            
            db_stats = db.insert_cars_bulk(cars_data)
            print(f"   [DB] {db_stats['success']} saved, {db_stats['errors']} errors")
            
        except Exception as e:
            print(f"   [DB ERROR] {e}")
        
        # Update counters
        successful = len([r for r in batch_results if r.get('success')])
        total_processed += len(batch_urls)
        
        print(f"   [SUCCESS] Batch {batch_number}: {successful}/{len(batch_urls)} successful")
        print(f"   [TOTAL] Processed: {total_processed}/{len(nodemaven_urls)} URLs")
        
        # Move to next batch
        current_index = end_index
        batch_number += 1
        
        # Small delay between batches
        if current_index < len(nodemaven_urls):
            print(f"   [NEXT] Moving to next batch...")
            time.sleep(2)
    
    print("\n" + "="*60)
    print("[COMPLETE] NODEMAVEN MERCEDES SCRAPING FINISHED!")
    print(f"   Total URLs processed: {total_processed}")
    print(f"   Total batches: {batch_number-1}")
    print("="*60)

def main():
    """Ana fonksiyon"""
    print("NODEMAVEN AUTO-RESTART MULTI-TAB SCRAPER STARTING...")
    
    # Check for --mercedes flag
    import sys
    mercedes_mode = '--mercedes' in sys.argv
    
    if mercedes_mode:
        # Mercedes continuous mode
        mercedes_continuous_scraping()
        return
    
    # Normal single batch mode
    test_urls = load_urls(5)
    
    if not test_urls:
        print("No URLs loaded!")
        return
    
    print(f"Test URLs loaded: {len(test_urls)}")
    print("Strategy: SADECE 1 BATCH TEST (5 URLs paralel)")
    
    # Scraper oluştur
    scraper = AutoRestartScraper()
    
    # Tüm URL'leri işle
    results = scraper.process_all_urls(test_urls)
    
    # Direkt Database'e kaydet (JSON kaydetmiyoruz - HIZ ICIN!)
    try:
        from db_manager_postgresql import SahibindenDB
        print(f"\n[DIRECT DB] Saving directly to database...")
        db = SahibindenDB()
        
        # JSON dosyasına kaydetmeden direkt database'e kaydet
        cars_data = []
        successful_results = [r for r in results if r.get('success')]
        for result in successful_results:
            car_data = db.extract_car_data(result)
            cars_data.append(car_data)
        
        # Bulk insert
        db_stats = db.insert_cars_bulk(cars_data)
        print(f"[DIRECT DB] Success: {db_stats['success']}, Errors: {db_stats['errors']}")
        
        # Database istatistikleri
        stats = db.get_stats()
        print(f"[DIRECT DB] Total cars in DB: {stats['total_cars']}")
        print(f"[DIRECT DB] Cars with damage: {stats['cars_with_damage']} ({stats['damage_rate']}%)")
        
    except Exception as e:
        print(f"[DIRECT DB ERROR] {e}")
    
    # Minimal JSON sadece özet için (backup değil)
    filename = scraper.save_results()
    
    # Örnek sonuçlar göster
    print(f"\nSample Results:")
    successful_results = [r for r in results if r.get('success')]
    for i, result in enumerate(successful_results[:3], 1):
        print(f"\n{i}. Title: {result.get('title', 'N/A')[:60]}...")
        print(f"   Price: {result.get('price', 'N/A')}")
        print(f"   Batch: {result.get('batch', 'N/A')}")
        if result.get('specs'):
            print(f"   Year: {result['specs'].get('Yıl', 'N/A')}")
    
    return results

if __name__ == "__main__":
    main()