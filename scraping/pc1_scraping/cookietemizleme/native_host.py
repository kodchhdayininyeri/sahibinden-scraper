#!/usr/bin/env python3
"""
Native Messaging Host for Cookie Cleaner Extension
Bu script extension ile Python arasında köprü kurar
"""

import sys
import json
import struct
import subprocess
import os
import logging
from pathlib import Path

# Log setup
logging.basicConfig(
    filename=r'C:\Users\emirh\cookietemizleme\native_host.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def send_message(message):
    """Extension'a mesaj gönder"""
    encoded_content = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('I', len(encoded_content))
    
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def read_message():
    """Extension'dan mesaj oku"""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
        
    message_length = struct.unpack('I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def run_botasaurus_scraper(urls):
    """Botasaurus scraper'ı çalıştır"""
    try:
        logging.info(f"Running scraper for {len(urls)} URLs")
        
        # Botasaurus scraper path
        scraper_path = r"C:\users\emirh\algofactproje\audi_botasaurus_scraper.py"
        
        if not os.path.exists(scraper_path):
            return {
                "success": False,
                "error": f"Scraper not found: {scraper_path}"
            }
        
        # URL'leri geçici dosyaya yaz
        temp_urls_file = r"C:\Users\emirh\cookietemizleme\temp_urls.txt"
        with open(temp_urls_file, 'w', encoding='utf-8') as f:
            for url in urls:
                f.write(url + '\n')
        
        # Python script'i çalıştır
        result = subprocess.run([
            sys.executable, 
            scraper_path,
            '--urls-file', temp_urls_file
        ], capture_output=True, text=True, timeout=300)
        
        # Geçici dosyayı sil
        try:
            os.remove(temp_urls_file)
        except:
            pass
            
        if result.returncode == 0:
            return {
                "success": True,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        else:
            return {
                "success": False,
                "error": result.stderr or "Unknown error",
                "stdout": result.stdout
            }
            
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Scraper timeout (5 minutes)"
        }
    except Exception as e:
        logging.error(f"Scraper error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """Ana loop"""
    logging.info("Native messaging host started")
    
    try:
        while True:
            message = read_message()
            if message is None:
                break
                
            logging.info(f"Received message: {message}")
            
            action = message.get('action')
            
            if action == 'ping':
                send_message({"success": True, "message": "pong"})
                
            elif action == 'run_scraper':
                urls = message.get('urls', [])
                if not urls:
                    send_message({
                        "success": False,
                        "error": "No URLs provided"
                    })
                    continue
                    
                # Scraper'ı çalıştır
                result = run_botasaurus_scraper(urls)
                send_message(result)
                
            elif action == 'get_scraper_status':
                # Scraper durumunu kontrol et
                scraper_path = r"C:\users\emirh\algofactproje\audi_botasaurus_scraper.py"
                send_message({
                    "success": True,
                    "scraper_exists": os.path.exists(scraper_path),
                    "scraper_path": scraper_path
                })
                
            else:
                send_message({
                    "success": False,
                    "error": f"Unknown action: {action}"
                })
                
    except Exception as e:
        logging.error(f"Main loop error: {e}")
        send_message({
            "success": False,
            "error": str(e)
        })
    
    logging.info("Native messaging host stopped")

if __name__ == '__main__':
    main()