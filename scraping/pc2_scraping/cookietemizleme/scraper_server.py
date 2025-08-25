#!/usr/bin/env python3
"""
HTTP Server for Botasaurus Integration
Extension bu server'a HTTP request gönderir, server botasaurus'u çalıştırır
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess
import sys
import os
import threading
import time
from urllib.parse import parse_qs
import logging

# Log setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

class ScraperHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """GET requests"""
        if self.path == '/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            scraper_path = r"C:\users\emirh\algofactproje\audi_botasaurus_scraper.py"
            response = {
                "status": "running",
                "scraper_exists": os.path.exists(scraper_path),
                "scraper_path": scraper_path
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"""
            <h1>Cookie Cleaner Scraper Server</h1>
            <p>Server is running on localhost:8080</p>
            <p>Endpoints:</p>
            <ul>
                <li>GET /status - Server status</li>
                <li>POST /scrape - Run scraper</li>
            </ul>
            """)
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """POST requests"""
        if self.path == '/scrape':
            try:
                # Request body'yi oku
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                urls = data.get('urls', [])
                if not urls:
                    self.send_error_response("No URLs provided")
                    return
                
                logging.info(f"Received scrape request for {len(urls)} URLs")
                
                # Botasaurus scraper'ı çalıştır
                result = self.run_scraper(urls)
                
                # Response gönder
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                logging.error(f"POST /scrape error: {e}")
                self.send_error_response(str(e))
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_error_response(self, error_message):
        """Error response gönder"""
        self.send_response(400)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        response = {"success": False, "error": error_message}
        self.wfile.write(json.dumps(response).encode())
    
    def run_scraper(self, urls):
        """Botasaurus scraper'ı çalıştır"""
        try:
            scraper_path = r"C:\users\emirh\algofactproje\audi_botasaurus_scraper.py"
            
            if not os.path.exists(scraper_path):
                return {
                    "success": False,
                    "error": f"Scraper not found: {scraper_path}"
                }
            
            # URL'leri geçici dosyaya yaz
            temp_urls_file = r"C:\Users\emirh\cookietemizleme\temp_scraper_urls.txt"
            with open(temp_urls_file, 'w', encoding='utf-8') as f:
                for url in urls:
                    f.write(url + '\n')
            
            logging.info("Starting Botasaurus scraper...")
            
            # Scraper'ı subprocess ile çalıştır
            process = subprocess.Popen([
                sys.executable, scraper_path
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            # Timeout ile bekle (5 dakika)
            stdout, stderr = process.communicate(timeout=300)
            
            # Geçici dosyayı sil
            try:
                os.remove(temp_urls_file)
            except:
                pass
            
            if process.returncode == 0:
                return {
                    "success": True,
                    "message": "Scraper completed successfully",
                    "stdout": stdout[-1000:],  # Son 1000 karakter
                    "urls_processed": len(urls)
                }
            else:
                return {
                    "success": False,
                    "error": f"Scraper failed with code {process.returncode}",
                    "stderr": stderr[-500:],  # Son 500 karakter
                    "stdout": stdout[-500:]
                }
                
        except subprocess.TimeoutExpired:
            process.kill()
            return {
                "success": False,
                "error": "Scraper timeout (5 minutes)"
            }
        except Exception as e:
            logging.error(f"Scraper execution error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def log_message(self, format, *args):
        """HTTP log mesajları"""
        logging.info(f"{self.address_string()} - {format % args}")

def start_server(port=8080):
    """HTTP server'ı başlat"""
    server = HTTPServer(('localhost', port), ScraperHandler)
    logging.info(f"🚀 Scraper server started on http://localhost:{port}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info("🛑 Server stopped")
        server.shutdown()

if __name__ == '__main__':
    port = 8080
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    
    start_server(port)