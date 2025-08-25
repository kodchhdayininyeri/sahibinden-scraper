# -*- coding: utf-8 -*-
"""
Sahibinden Scraper PostgreSQL Database Manager
PC1 için PostgreSQL bağlantısı (localhost)
"""

import psycopg2
import json
import os
from datetime import datetime
from typing import Dict, List, Any

class SahibindenDB:
    def __init__(self):
        """Initialize PostgreSQL connection"""
        self.init_database()
        
    def get_connection(self):
        """PostgreSQL bağlantısı al"""
        try:
            conn = psycopg2.connect(
                host="localhost",
                port=5432,
                database="sahibinden_cars",
                user="postgres",
                password="YOUR_DATABASE_PASSWORD"
            )
            return conn
        except Exception as e:
            print(f"[ERROR] PostgreSQL connection failed: {e}")
            raise e
        
    def init_database(self):
        """Create database tables if not exists"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Cars tablosu zaten mevcut (migration ile oluşturuldu)
        # Sadece bağlantıyı test edelim
        try:
            cursor.execute("SELECT COUNT(*) FROM cars")
            count = cursor.fetchone()[0]
            print(f"[DB] PostgreSQL connection OK - {count} cars in database")
        except Exception as e:
            print(f"[ERROR] Database check failed: {e}")
            
        cursor.close()
        conn.close()
    
    def save_car_data(self, car_data: Dict[str, Any], batch_id: int = None, tab_index: int = None, proxy_type: str = None) -> bool:
        """Save car data to PostgreSQL"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Önce tüm verileri hazırla
            # Temel veriler
            url = car_data.get('url', '')
            ilan_no = car_data.get('ilan_no', '')
            title = car_data.get('title', '')
            price = car_data.get('price', '')
            
            # Araç özellikleri
            marka = car_data.get('marka', '')
            model = car_data.get('model', '')
            seri = car_data.get('seri', '')
            yil = self.safe_int(car_data.get('yil'))
            km = car_data.get('km', '')
            yakit_tipi = car_data.get('yakit_tipi', '')
            vites = car_data.get('vites', '')
            renk = car_data.get('renk', '')
            kasa_tipi = car_data.get('kasa_tipi', '')
            motor_gucu = car_data.get('motor_gucu', '')
            motor_hacmi = car_data.get('motor_hacmi', '')
            cekis = car_data.get('cekis', '')
            kimden = car_data.get('kimden', '')
            takas = car_data.get('takas', '')
            garanti = car_data.get('garanti', '')
            agir_hasar = car_data.get('agir_hasar', '')
            plaka_uyruk = car_data.get('plaka_uyruk', '')
            vehicle_condition = car_data.get('vehicle_condition', '')
            
            # Lokasyon
            location_full = car_data.get('location_full', '')
            loc1 = car_data.get('loc1', '')
            loc2 = car_data.get('loc2', '')
            loc3 = car_data.get('loc3', '')
            loc4 = car_data.get('loc4', '')
            loc5 = car_data.get('loc5', '')
            
            # JSON alanları
            specs_json = json.dumps(car_data.get('specs', {}), ensure_ascii=False) if car_data.get('specs') else None
            features_json = json.dumps(car_data.get('features', {}), ensure_ascii=False) if car_data.get('features') else None
            paint_damage_json = json.dumps(car_data.get('paint_damage', {}), ensure_ascii=False) if car_data.get('paint_damage') else None
            
            # Feature sayıları
            painted_parts_count = self.safe_int(car_data.get('painted_parts_count', 0))
            changed_parts_count = self.safe_int(car_data.get('changed_parts_count', 0))
            total_damage_areas = self.safe_int(car_data.get('total_damage_areas', 0))
            
            guvenlik_features = self.safe_int(car_data.get('guvenlik_features', 0))
            ic_donanim_features = self.safe_int(car_data.get('ic_donanim_features', 0))
            dis_donanim_features = self.safe_int(car_data.get('dis_donanim_features', 0))
            multimedya_features = self.safe_int(car_data.get('multimedya_features', 0))
            
            # Meta data
            success = car_data.get('success', True)
            collected = car_data.get('collected', True)
            error_message = car_data.get('error_message', '')
            timestamp = car_data.get('timestamp', datetime.now().isoformat())
            ilan_tarihi = car_data.get('ilan_tarihi', '')
            
            # URL'nin zaten var olup olmadığını kontrol et
            cursor.execute("SELECT id FROM cars WHERE url = %s", (url,))
            existing = cursor.fetchone()
            
            if existing:
                # SKIP - Zaten var olan veriyi atlıyoruz
                print(f"[SKIP] Already exists: {car_data.get('url', 'N/A')[:60]}...")
                cursor.close()
                conn.close()
                return False
            
            # Insert data
            cursor.execute("""
                INSERT INTO cars (
                    url, ilan_no, title, price, marka, model, seri, yil, km, yakit_tipi, vites, renk,
                    kasa_tipi, motor_gucu, motor_hacmi, cekis, kimden, takas, garanti, agir_hasar,
                    plaka_uyruk, vehicle_condition, location_full, loc1, loc2, loc3, loc4, loc5,
                    specs_json, features_json, paint_damage_json, painted_parts_count, changed_parts_count,
                    total_damage_areas, guvenlik_features, ic_donanim_features, dis_donanim_features,
                    multimedya_features, batch_id, tab_index, proxy_type, success, collected,
                    error_message, timestamp, ilan_tarihi
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                )
            """, (
                url, ilan_no, title, price, marka, model, seri, yil, km, yakit_tipi, vites, renk,
                kasa_tipi, motor_gucu, motor_hacmi, cekis, kimden, takas, garanti, agir_hasar,
                plaka_uyruk, vehicle_condition, location_full, loc1, loc2, loc3, loc4, loc5,
                specs_json, features_json, paint_damage_json, painted_parts_count, changed_parts_count,
                total_damage_areas, guvenlik_features, ic_donanim_features, dis_donanim_features,
                multimedya_features, batch_id, tab_index, proxy_type, success, collected,
                error_message, timestamp, ilan_tarihi
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"[SAVED] {marka} {model} - {price}")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to save car data: {e}")
            conn.rollback()
            cursor.close()
            conn.close()
            return False
    
    def safe_int(self, value, default=0):
        """Safely convert to integer"""
        if value is None or value == '':
            return default
        try:
            if isinstance(value, str):
                # Remove any non-numeric characters except digits
                value = ''.join(filter(str.isdigit, value))
                if not value:
                    return default
            return int(value)
        except (ValueError, TypeError):
            return default
    
    def extract_car_data(self, scraped_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract car data from scraped result"""
        try:
            # Scraped result'tan car data'yı çıkar
            car_data = {}
            
            # Temel bilgiler
            car_data['url'] = scraped_result.get('url', '')
            car_data['title'] = scraped_result.get('title', '')
            car_data['price'] = scraped_result.get('price', '')
            car_data['ilan_no'] = scraped_result.get('ilan_no', '')
            car_data['location'] = scraped_result.get('location', '')
            
            # Specs nesnesinden alanları çıkar
            specs = scraped_result.get('specs', {})
            if specs:
                car_data['marka'] = specs.get('Marka', '')
                car_data['model'] = specs.get('Model', '')
                car_data['seri'] = specs.get('Seri', '')
                car_data['yil'] = specs.get('Yıl', '')
                car_data['km'] = specs.get('KM', '')
                car_data['yakit_tipi'] = specs.get('Yakıt Tipi', '')
                car_data['vites'] = specs.get('Vites', '')
                car_data['renk'] = specs.get('Renk', '')
                car_data['kasa_tipi'] = specs.get('Kasa Tipi', '')
                car_data['motor_gucu'] = specs.get('Motor Gücü', '')
                car_data['motor_hacmi'] = specs.get('Motor Hacmi', '')
                car_data['cekis'] = specs.get('Çekiş', '')
                car_data['kimden'] = specs.get('Kimden', '')
                car_data['takas'] = specs.get('Takas', '')
                car_data['garanti'] = specs.get('Garanti', '')
                car_data['agir_hasar'] = specs.get('Ağır Hasar Kayıtlı', '')
                car_data['plaka_uyruk'] = specs.get('Plaka / Uyruk', '')
                car_data['vehicle_condition'] = specs.get('vehicleCondition', '')
                car_data['ilan_tarihi'] = specs.get('İlan Tarihi', '')
                
                # Lokasyon bilgileri
                car_data['loc1'] = specs.get('loc1', '')
                car_data['loc2'] = specs.get('loc2', '')
                car_data['loc3'] = specs.get('loc3', '')
                car_data['loc4'] = specs.get('loc4', '')
                car_data['loc5'] = specs.get('loc5', '')
            
            # Features ve paint_damage direkt kopyala (bunlar JSON olarak kaydedilecek)
            car_data['features'] = scraped_result.get('features', {})
            car_data['paint_damage'] = scraped_result.get('paint_damage', {})
            car_data['specs'] = specs
            
            # Location full
            car_data['location_full'] = scraped_result.get('location', '')
            
            # Meta data
            car_data['success'] = scraped_result.get('success', True)
            car_data['collected'] = scraped_result.get('collected', True)
            car_data['error_message'] = scraped_result.get('error', '')
            car_data['timestamp'] = scraped_result.get('timestamp', '')
            car_data['batch'] = scraped_result.get('batch', 1)
            car_data['tab_index'] = scraped_result.get('tab_index', 0)
            car_data['proxy_type'] = scraped_result.get('proxy_type', '')
            
            # Feature sayıları hesapla
            if car_data['features']:
                features = car_data['features']
                car_data['guvenlik_features'] = len([f for f in features.get('guvenlik', []) if f.get('checked')])
                car_data['ic_donanim_features'] = len([f for f in features.get('ic_donanim', []) if f.get('checked')])
                car_data['dis_donanim_features'] = len([f for f in features.get('dis_donanim', []) if f.get('checked')])
                car_data['multimedya_features'] = len([f for f in features.get('multimedya', []) if f.get('checked')])
            
            # Paint/damage sayıları hesapla
            if car_data['paint_damage']:
                paint_damage = car_data['paint_damage']
                car_data['painted_parts_count'] = len(paint_damage.get('painted_parts', []))
                car_data['changed_parts_count'] = len(paint_damage.get('changed_parts', []))
                car_data['total_damage_areas'] = len(paint_damage.get('damage_areas', {}))
            
            return car_data
            
        except Exception as e:
            print(f"[ERROR] Failed to extract car data: {e}")
            return {}
    
    def insert_cars_bulk(self, cars_data: List[Dict[str, Any]], batch_id: int = None, proxy_type: str = None) -> Dict[str, int]:
        """Bulk insert cars data"""
        success_count = 0
        error_count = 0
        
        for i, car_data in enumerate(cars_data):
            try:
                # Her car için save_car_data kullan
                success = self.save_car_data(
                    car_data, 
                    batch_id=batch_id, 
                    tab_index=i+1, 
                    proxy_type=proxy_type
                )
                
                if success:
                    success_count += 1
                else:
                    error_count += 1
                    
            except Exception as e:
                print(f"[ERROR] Bulk insert failed for car {i+1}: {e}")
                error_count += 1
        
        return {
            'success': success_count,
            'errors': error_count,
            'total': len(cars_data)
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Total cars
            cursor.execute("SELECT COUNT(*) FROM cars")
            total_cars = cursor.fetchone()[0]
            
            # Cars with damage
            cursor.execute("SELECT COUNT(*) FROM cars WHERE total_damage_areas > 0")
            damaged_cars = cursor.fetchone()[0]
            
            # Cars by brand
            cursor.execute("""
                SELECT marka, COUNT(*) as count 
                FROM cars 
                WHERE marka IS NOT NULL AND marka != ''
                GROUP BY marka 
                ORDER BY count DESC 
                LIMIT 10
            """)
            brands = cursor.fetchall()
            
            # Recent cars
            cursor.execute("""
                SELECT title, marka, model, price 
                FROM cars 
                ORDER BY id DESC 
                LIMIT 5
            """)
            recent = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            damage_percentage = (damaged_cars / total_cars * 100) if total_cars > 0 else 0
            
            return {
                'total_cars': total_cars,
                'cars_with_damage': damaged_cars,
                'damage_rate': round(damage_percentage, 1),
                'top_brands': [{'brand': b[0], 'count': b[1]} for b in brands],
                'recent_cars': [{'title': r[0], 'brand': r[1], 'model': r[2], 'price': r[3]} for r in recent]
            }
            
        except Exception as e:
            print(f"[ERROR] Stats query failed: {e}")
            cursor.close()
            conn.close()
            return {'error': str(e)}

# Test
if __name__ == "__main__":
    db = SahibindenDB()
    stats = db.get_stats()
    print(f"Database Stats: {stats}")