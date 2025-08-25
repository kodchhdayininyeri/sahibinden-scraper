const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all cars with optional limit
router.get('/', async (req, res) => {
    try {
        const limit = req.query.limit || 1000;
        const query = `
            SELECT 
                id,
                ilan_no,
                title,
                marka,
                model,
                seri,
                yil,
                km,
                price,
                CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER) AS fiyat,
                yakit_tipi,
                vites,
                renk,
                kimden,
                kasa_tipi,
                motor_gucu,
                motor_hacmi,
                cekis,
                takas,
                garanti,
                agir_hasar,
                plaka_uyruk,
                vehicle_condition,
                location_full,
                url,
                specs_json,
                features_json,
                paint_damage_json,
                painted_parts_count,
                changed_parts_count,
                total_damage_areas,
                guvenlik_features,
                ic_donanim_features,
                dis_donanim_features,
                multimedya_features,
                ilan_tarihi,
                scraped_at
            FROM cars 
            WHERE price IS NOT NULL AND price != '' 
            ORDER BY scraped_at DESC 
            LIMIT $1
        `;
        
        const result = await pool.query(query, [limit]);
        
        res.json({
            success: true,
            count: result.rows.length,
            results: result.rows.map(car => {
                // Parse JSON strings
                let specs = {};
                let features = {};
                let paintDamage = {};
                
                try {
                    specs = car.specs_json ? JSON.parse(car.specs_json) : {};
                } catch (e) {
                    specs = {};
                }
                
                try {
                    features = car.features_json ? JSON.parse(car.features_json) : {};
                } catch (e) {
                    features = {};
                }
                
                try {
                    paintDamage = car.paint_damage_json ? JSON.parse(car.paint_damage_json) : {};
                } catch (e) {
                    paintDamage = {};
                }
                
                return {
                    // Temel bilgiler
                    ilanNo: car.ilan_no,
                    title: car.title,
                    marka: car.marka || 'Bilinmiyor',
                    model: car.model || 'Bilinmiyor',
                    seri: car.seri,
                    yil: car.yil || 'Bilinmiyor',
                    km: car.km || 'Bilinmiyor',
                    fiyat: car.fiyat,
                    fiyatStr: car.price || 'Belirtilmemiş',
                    
                    // Araç özellikleri
                    yakit: car.yakit_tipi || 'Bilinmiyor',
                    vites: car.vites || 'Bilinmiyor',
                    renk: car.renk || 'Bilinmiyor',
                    kasaTipi: car.kasa_tipi,
                    motorGucu: car.motor_gucu,
                    motorHacmi: car.motor_hacmi,
                    cekis: car.cekis,
                    
                    // Satıcı bilgileri
                    kimden: car.kimden || 'Bilinmiyor',
                    takas: car.takas,
                    garanti: car.garanti,
                    
                    // Durum bilgileri
                    agirHasar: car.agir_hasar,
                    plakaUyruk: car.plaka_uyruk,
                    vehicleCondition: car.vehicle_condition,
                    
                    // Konum
                    location: car.location_full,
                    
                    // Hasar bilgileri
                    paintDamage: paintDamage,
                    paintedPartsCount: car.painted_parts_count,
                    changedPartsCount: car.changed_parts_count,
                    totalDamageAreas: car.total_damage_areas,
                    
                    // Özellik sayıları
                    featureCounts: {
                        guvenlik: car.guvenlik_features,
                        icDonanim: car.ic_donanim_features,
                        disDonanim: car.dis_donanim_features,
                        multimedya: car.multimedya_features
                    },
                    
                    // Detaylı özellikler
                    features: features,
                    specs: specs,
                    
                    // Diğer
                    url: car.url,
                    ilanTarihi: car.ilan_tarihi,
                    scrapeDate: car.scraped_at
                };
            })
        });
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET statistics
router.get('/stats', async (req, res) => {
    try {
        const { brand, model, year, fuel, transmission, seller } = req.query;
        
        let whereConditions = [`price IS NOT NULL AND price != ''`];
        let params = [];
        let paramIndex = 1;
        
        if (brand) {
            whereConditions.push(`marka = $${paramIndex++}`);
            params.push(brand);
        }
        if (model) {
            whereConditions.push(`model = $${paramIndex++}`);
            params.push(model);
        }
        if (year) {
            whereConditions.push(`yil = $${paramIndex++}`);
            params.push(year);
        }
        if (fuel) {
            whereConditions.push(`yakit_tipi = $${paramIndex++}`);
            params.push(fuel);
        }
        if (transmission) {
            whereConditions.push(`vites = $${paramIndex++}`);
            params.push(transmission);
        }
        if (seller) {
            whereConditions.push(`kimden = $${paramIndex++}`);
            params.push(seller);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                COUNT(*) as total_count,
                AVG(CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)) as avg_price,
                MIN(CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)) as min_price,
                MAX(CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)) as max_price,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)) as median_price
            FROM cars 
            WHERE ${whereClause}
        `;
        
        const result = await pool.query(query, params);
        const stats = result.rows[0];
        
        res.json({
            success: true,
            stats: {
                totalCount: parseInt(stats.total_count),
                avgPrice: Math.round(stats.avg_price || 0),
                minPrice: stats.min_price || 0,
                maxPrice: stats.max_price || 0,
                medianPrice: Math.round(stats.median_price || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET filter options
router.get('/filters', async (req, res) => {
    try {
        const queries = {
            brands: `SELECT DISTINCT marka as brand, COUNT(*) as count 
                     FROM cars WHERE marka IS NOT NULL AND price IS NOT NULL 
                     GROUP BY marka ORDER BY marka`,
            
            models: `SELECT DISTINCT model, marka as brand, seri, COUNT(*) as count 
                     FROM cars WHERE model IS NOT NULL AND price IS NOT NULL 
                     GROUP BY model, marka, seri ORDER BY marka, seri, model`,
            
            series: `SELECT 
                     CASE 
                         WHEN seri LIKE 'A1%' THEN 'A1'
                         WHEN seri LIKE 'A2%' THEN 'A2'
                         WHEN seri LIKE 'A3%' THEN 'A3'
                         WHEN seri LIKE 'A4%' THEN 'A4'
                         WHEN seri LIKE 'A5%' THEN 'A5'
                         WHEN seri LIKE 'A6%' THEN 'A6'
                         WHEN seri LIKE 'A7%' THEN 'A7'
                         WHEN seri LIKE 'A8%' THEN 'A8'
                         WHEN seri LIKE 'Q%' THEN SUBSTRING(seri FROM 1 FOR 2)
                         ELSE seri
                     END as series,
                     marka as brand,
                     COUNT(*) as count
                     FROM cars 
                     WHERE seri IS NOT NULL AND seri != '' AND price IS NOT NULL
                     GROUP BY series, marka 
                     ORDER BY marka, series`,
            
            years: `SELECT DISTINCT yil as year, COUNT(*) as count 
                    FROM cars WHERE yil IS NOT NULL AND price IS NOT NULL 
                    GROUP BY yil ORDER BY yil DESC`,
            
            fuels: `SELECT DISTINCT yakit_tipi as fuel_type, COUNT(*) as count 
                    FROM cars WHERE yakit_tipi IS NOT NULL AND price IS NOT NULL 
                    GROUP BY yakit_tipi ORDER BY yakit_tipi`,
            
            transmissions: `SELECT DISTINCT vites as transmission, COUNT(*) as count 
                           FROM cars WHERE vites IS NOT NULL AND price IS NOT NULL 
                           GROUP BY vites ORDER BY vites`,
            
            sellers: `SELECT DISTINCT kimden as seller_type, COUNT(*) as count 
                     FROM cars WHERE kimden IS NOT NULL AND price IS NOT NULL 
                     GROUP BY kimden ORDER BY kimden`,
            
            cities: `SELECT DISTINCT 
                        CASE 
                            WHEN location_full LIKE '%/%' THEN TRIM(SPLIT_PART(location_full, '/', 1))
                            ELSE TRIM(location_full)
                        END as city, 
                        COUNT(*) as count 
                     FROM cars 
                     WHERE location_full IS NOT NULL AND location_full != '' AND price IS NOT NULL 
                     GROUP BY city 
                     ORDER BY count DESC, city LIMIT 30`
        };
        
        const filters = {};
        
        for (const [key, query] of Object.entries(queries)) {
            const result = await pool.query(query);
            filters[key] = result.rows;
        }
        
        res.json({
            success: true,
            filters
        });
    } catch (error) {
        console.error('Error fetching filters:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET search with filters
router.get('/search', async (req, res) => {
    console.log('🔥 SEARCH REQUEST:', req.query);
    try {
        const { 
            search, 
            brand, 
            series,
            subModel, 
            model, 
            year, 
            fuel, 
            transmission, 
            seller,
            city,
            minPrice,
            maxPrice,
            minKm,
            maxKm,
            yearMin,
            yearMax,
            sortBy = 'price',
            sortOrder = 'ASC',
            page = 1,
            pageSize = 20
        } = req.query;
        
        let whereConditions = [`price IS NOT NULL AND price != ''`];
        let params = [];
        let paramIndex = 1;
        
        // Search term
        if (search) {
            whereConditions.push(`(
                marka ILIKE $${paramIndex} OR 
                model ILIKE $${paramIndex} OR 
                CAST(yil AS TEXT) LIKE $${paramIndex}
            )`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        // Filters
        if (brand) {
            const brands = brand.split(',');
            whereConditions.push(`marka = ANY($${paramIndex++})`);
            params.push(brands);
        }
        
        if (series) {
            const seriesArray = series.split(',');
            whereConditions.push(`seri = ANY($${paramIndex++})`);
            params.push(seriesArray);
        }
        
        // Sub-model filtering (for A1, A3, etc.)
        if (subModel && series) {
            if (series === 'A1') {
                // For A1, subModel is engine type like "1.4 TFSI" or "1.6 TDI"
                whereConditions.push(`UPPER(model) LIKE $${paramIndex++}`);
                params.push(`%${subModel.toUpperCase()}%`);
            } else {
                // For A3, A4, A5 etc., subModel is body type like "Sedan"
                whereConditions.push(`model LIKE $${paramIndex++}`);
                params.push(`%${series} ${subModel}%`);
            }
        }
        
        if (model) {
            const models = model.split(',');
            if (series === 'A1') {
                // For A1, use LIKE matching since model names contain engine info
                whereConditions.push(`model LIKE ANY($${paramIndex++})`);
                params.push(models.map(m => `%${m}%`));
            } else {
                whereConditions.push(`model = ANY($${paramIndex++})`);
                params.push(models);
            }
        }
        
        if (year) {
            const years = year.split(',').map(y => parseInt(y));
            whereConditions.push(`yil = ANY($${paramIndex++})`);
            params.push(years);
        }
        
        if (fuel) {
            const fuels = fuel.split(',');
            whereConditions.push(`yakit_tipi = ANY($${paramIndex++})`);
            params.push(fuels);
        }
        
        if (transmission) {
            const transmissions = transmission.split(',');
            whereConditions.push(`vites = ANY($${paramIndex++})`);
            params.push(transmissions);
        }
        
        if (seller) {
            const sellers = seller.split(',');
            whereConditions.push(`kimden = ANY($${paramIndex++})`);
            params.push(sellers);
        }
        
        if (city) {
            const cities = city.split(',');
            // City filter: check both full location and extracted city
            whereConditions.push(`(
                location_full = ANY($${paramIndex}) OR 
                CASE 
                    WHEN location_full LIKE '%/%' THEN TRIM(SPLIT_PART(location_full, '/', 1))
                    ELSE TRIM(location_full)
                END = ANY($${paramIndex + 1})
            )`);
            params.push(cities);
            params.push(cities);
            paramIndex += 2;
        }
        
        // Price range
        if (minPrice) {
            whereConditions.push(`CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER) >= $${paramIndex++}`);
            params.push(minPrice);
        }
        
        if (maxPrice) {
            whereConditions.push(`CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER) <= $${paramIndex++}`);
            params.push(maxPrice);
        }
        
        // KM range
        if (minKm) {
            whereConditions.push(`km >= $${paramIndex++}`);
            params.push(minKm);
        }
        
        if (maxKm) {
            whereConditions.push(`km <= $${paramIndex++}`);
            params.push(maxKm);
        }
        
        // Year range
        if (yearMin) {
            console.log('📅 Adding yearMin condition:', yearMin);
            whereConditions.push(`CAST(yil AS INTEGER) >= $${paramIndex++}`);
            params.push(yearMin);
        }
        
        if (yearMax) {
            console.log('📅 Adding yearMax condition:', yearMax);
            whereConditions.push(`CAST(yil AS INTEGER) <= $${paramIndex++}`);
            params.push(yearMax);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Validate sort column
        const validSortColumns = ['price', 'year', 'yil', 'km', 'scraped_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? 
            (sortBy === 'price' ? `CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)` : 
             sortBy === 'year' ? `CAST(yil AS INTEGER)` : 
             sortBy === 'km' ? `CAST(REPLACE(km, '.', '') AS INTEGER)` : sortBy) : 'scraped_at';
        const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        // Get total count and statistics for ALL filtered results
        const countQuery = `
            SELECT 
                COUNT(*) as total,
                AVG(CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)) as avg_price,
                MIN(CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)) as min_price,
                MAX(CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER)) as max_price
            FROM cars 
            WHERE ${whereClause}
        `;
        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].total);
        const avgPrice = parseFloat(countResult.rows[0].avg_price);
        const resultMinPrice = parseFloat(countResult.rows[0].min_price);
        const resultMaxPrice = parseFloat(countResult.rows[0].max_price);
        
        console.log('📊 COUNT RESULT:', countResult.rows[0]);
        console.log('📊 AVG PRICE:', avgPrice, 'TOTAL:', totalCount);
        console.log('📊 FORMATTED AVG PRICE:', Math.round(avgPrice));
        console.log('📊 AVG PRICE IS NULL/NaN?', avgPrice === null, isNaN(avgPrice));
        
        // Calculate pagination
        const currentPage = parseInt(page);
        const limit = parseInt(pageSize);
        const offset = (currentPage - 1) * limit;
        const totalPages = Math.ceil(totalCount / limit);
        
        // Get paginated results
        const query = `
            SELECT 
                id,
                ilan_no,
                title,
                marka,
                model,
                seri,
                yil,
                km,
                price,
                CAST(REPLACE(REPLACE(price, '.', ''), ' TL', '') AS INTEGER) AS fiyat,
                yakit_tipi,
                vites,
                renk,
                kimden,
                kasa_tipi,
                motor_gucu,
                motor_hacmi,
                cekis,
                takas,
                garanti,
                agir_hasar,
                plaka_uyruk,
                vehicle_condition,
                location_full,
                url,
                specs_json,
                features_json,
                paint_damage_json,
                painted_parts_count,
                changed_parts_count,
                total_damage_areas,
                guvenlik_features,
                ic_donanim_features,
                dis_donanim_features,
                multimedya_features,
                ilan_tarihi,
                scraped_at
            FROM cars 
            WHERE ${whereClause}
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            totalCount,
            count: result.rows.length,
            pagination: {
                currentPage,
                totalPages,
                pageSize: limit,
                hasNext: currentPage < totalPages,
                hasPrev: currentPage > 1
            },
            statistics: {
                avgPrice: avgPrice ? Math.round(avgPrice) : 0,
                minPrice: resultMinPrice ? Math.round(resultMinPrice) : 0,
                maxPrice: resultMaxPrice ? Math.round(resultMaxPrice) : 0
            },
            results: result.rows.map(car => {
                // Parse JSON strings
                let specs = {};
                let features = {};
                let paintDamage = {};
                
                try {
                    specs = car.specs_json ? JSON.parse(car.specs_json) : {};
                } catch (e) {
                    specs = {};
                }
                
                try {
                    features = car.features_json ? JSON.parse(car.features_json) : {};
                } catch (e) {
                    features = {};
                }
                
                try {
                    paintDamage = car.paint_damage_json ? JSON.parse(car.paint_damage_json) : {};
                } catch (e) {
                    paintDamage = {};
                }
                
                return {
                    // Temel bilgiler
                    ilanNo: car.ilan_no,
                    title: car.title,
                    marka: car.marka || 'Bilinmiyor',
                    model: car.model || 'Bilinmiyor',
                    seri: car.seri,
                    yil: car.yil || 'Bilinmiyor',
                    km: car.km || 'Bilinmiyor',
                    fiyat: car.fiyat,
                    fiyatStr: car.price || 'Belirtilmemiş',
                    
                    // Araç özellikleri
                    yakit: car.yakit_tipi || 'Bilinmiyor',
                    vites: car.vites || 'Bilinmiyor',
                    renk: car.renk || 'Bilinmiyor',
                    kasaTipi: car.kasa_tipi,
                    motorGucu: car.motor_gucu,
                    motorHacmi: car.motor_hacmi,
                    cekis: car.cekis,
                    
                    // Satıcı bilgileri
                    kimden: car.kimden || 'Bilinmiyor',
                    takas: car.takas,
                    garanti: car.garanti,
                    
                    // Durum bilgileri
                    agirHasar: car.agir_hasar,
                    plakaUyruk: car.plaka_uyruk,
                    vehicleCondition: car.vehicle_condition,
                    
                    // Konum
                    location: car.location_full,
                    
                    // Hasar bilgileri
                    paintDamage: paintDamage,
                    paintedPartsCount: car.painted_parts_count,
                    changedPartsCount: car.changed_parts_count,
                    totalDamageAreas: car.total_damage_areas,
                    
                    // Özellik sayıları
                    featureCounts: {
                        guvenlik: car.guvenlik_features,
                        icDonanim: car.ic_donanim_features,
                        disDonanim: car.dis_donanim_features,
                        multimedya: car.multimedya_features
                    },
                    
                    // Detaylı özellikler
                    features: features,
                    specs: specs,
                    
                    // Diğer
                    url: car.url,
                    ilanTarihi: car.ilan_tarihi,
                    scrapeDate: car.scraped_at
                };
            })
        });
    } catch (error) {
        console.error('Error searching cars:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET dynamic city filters based on current selections
router.get('/cities', async (req, res) => {
    console.log('🏙️ CITIES REQUEST - Query params:', req.query);
    try {
        const { 
            brand, 
            series, 
            subModel, 
            model,
            yearMin,
            yearMax,
            kmMin,
            kmMax,
            priceMin,
            priceMax,
            fuel,
            transmission
        } = req.query;
        console.log('🏙️ CITIES REQUEST - All params:', {brand, series, subModel, model, yearMin, yearMax, kmMin, kmMax, priceMin, priceMax, fuel, transmission});
        
        let whereConditions = [`location_full IS NOT NULL AND location_full != '' AND price IS NOT NULL`];
        let params = [];
        let paramIndex = 1;
        
        // Apply filters to narrow down cities
        if (brand) {
            console.log('🏙️ Adding brand filter:', brand);
            whereConditions.push(`marka = $${paramIndex++}`);
            params.push(brand);
        }
        
        if (series) {
            console.log('🏙️ Adding series filter:', series);
            const seriesArray = series.split(',');
            whereConditions.push(`seri = ANY($${paramIndex++})`);
            params.push(seriesArray);
        }
        
        if (subModel) {
            console.log('🏙️ Adding subModel filter:', subModel);
            whereConditions.push(`model LIKE $${paramIndex++}`);
            params.push('%' + subModel + '%');
        }
        
        if (model) {
            console.log('🏙️ Adding model filter:', model);
            whereConditions.push(`model = $${paramIndex++}`);
            params.push(model);
        }
        
        // Add year range filters
        if (yearMin) {
            console.log('🏙️ Adding yearMin filter:', yearMin);
            whereConditions.push(`yil >= $${paramIndex++}`);
            params.push(parseInt(yearMin));
        }
        
        if (yearMax) {
            console.log('🏙️ Adding yearMax filter:', yearMax);
            whereConditions.push(`yil <= $${paramIndex++}`);
            params.push(parseInt(yearMax));
        }
        
        // Add KM range filters
        if (kmMin) {
            console.log('🏙️ Adding kmMin filter:', kmMin);
            whereConditions.push(`km >= $${paramIndex++}`);
            params.push(parseInt(kmMin));
        }
        
        if (kmMax) {
            console.log('🏙️ Adding kmMax filter:', kmMax);
            whereConditions.push(`km <= $${paramIndex++}`);
            params.push(parseInt(kmMax));
        }
        
        // Add price range filters
        if (priceMin) {
            console.log('🏙️ Adding priceMin filter:', priceMin);
            whereConditions.push(`price >= $${paramIndex++}`);
            params.push(parseInt(priceMin));
        }
        
        if (priceMax) {
            console.log('🏙️ Adding priceMax filter:', priceMax);
            whereConditions.push(`price <= $${paramIndex++}`);
            params.push(parseInt(priceMax));
        }
        
        // Add fuel type filters
        if (fuel) {
            console.log('🏙️ Adding fuel filter:', fuel);
            const fuelArray = Array.isArray(fuel) ? fuel : [fuel];
            whereConditions.push(`yakit_tipi = ANY($${paramIndex++})`);
            params.push(fuelArray);
        }
        
        // Add transmission filters
        if (transmission) {
            console.log('🏙️ Adding transmission filter:', transmission);
            const transmissionArray = Array.isArray(transmission) ? transmission : [transmission];
            whereConditions.push(`vites = ANY($${paramIndex++})`);
            params.push(transmissionArray);
        }
        
        console.log('🏙️ Final WHERE conditions:', whereConditions);
        console.log('🏙️ Final params:', params);
        
        const query = `
            SELECT DISTINCT 
                CASE 
                    WHEN location_full LIKE '%/%' THEN TRIM(SPLIT_PART(location_full, '/', 1))
                    ELSE TRIM(location_full)
                END as city, 
                COUNT(*) as count 
            FROM cars 
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY city 
            ORDER BY count DESC, city 
            LIMIT 20
        `;
        
        console.log('🏙️ Final SQL Query:', query);
        console.log('🏙️ Query params:', params);
        
        const result = await pool.query(query, params);
        
        console.log('🏙️ Query result count:', result.rows.length);
        console.log('🏙️ First 5 results:', result.rows.slice(0, 5));
        
        res.json({
            success: true,
            cities: result.rows
        });
    } catch (error) {
        console.error('Error fetching dynamic cities:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;