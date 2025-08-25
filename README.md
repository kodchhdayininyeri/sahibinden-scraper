# Sahibinden Car Analyzer Platform

Advanced web scraping and analysis system for Turkish automotive marketplace data extraction with real-time filtering capabilities.

##  Project Highlights

Successfully developed a production-ready platform that extracts, processes, and analyzes car listings from Sahibinden.com using parallel scraping architecture and anti-detection mechanisms.

### Key Achievements
- **8,865+ car records** extracted and stored in production database
- **5 parallel scrapers** running simultaneously across 2 machines
- **85%+ success rate** despite advanced bot protection
- **Live deployment** at https://ozsahibinden-backend.onrender.com

##  Technical Implementation

### Scraping Infrastructure
- **Dual-PC Architecture**: Distributed scraping across 2 machines for maximum efficiency
- **Mobile Proxy Rotation**: SOAX (Turkcell/Vodafone) + NodeMaven proxies for IP diversity
- **Anti-Bot Systems**: Custom Chrome extension for cookie management and detection bypass
- **SeleniumBase Framework**: Undetected browser automation with stealth features

### Full-Stack Application
- **Frontend**: Dynamic HTML interface with Tailwind CSS, real-time filtering, responsive tables
- **Backend**: Express.js REST API with optimized PostgreSQL queries
- **Database**: PostgreSQL with indexed columns for sub-100ms query performance
- **Deployment**: Production deployment on Render.com with automated scaling

##  System Components

### `/backend`
Express.js API server handling all data operations and client requests

### `/scraping/pc1_scraping`
Primary scraping cluster with 3 parallel instances using SOAX and NodeMaven proxies

### `/scraping/pc2_scraping`  
Secondary scraping cluster with 2 parallel instances for load distribution

### `/scraping/sahibinden_url_extractor`
Chrome extension for efficient URL extraction from listing pages

##  Technical Challenges Solved

1. **Cloudflare Bypass**: Implemented mobile proxy rotation with mobile IPs
2. **Rate Limiting**: Distributed load across multiple instances with intelligent delays
3. **Data Consistency**: Robust parsing system with multiple fallback methods
4. **Scale Management**: Handled 10K+ URLs with batch processing and auto-restart mechanisms
5. **Bot Detection**: Custom cookie cleaning and browser fingerprint randomization

## 🛠 Tech Stack

**Backend**: Node.js, Express.js, PostgreSQL  
**Scraping**: Python, SeleniumBase, Chrome Extensions  
**Frontend**: HTML5, Tailwind CSS, JavaScript  
**Infrastructure**: Docker, Render.com, GitHub  
**Proxies**: SOAX Mobile, NodeMaven Mobile

##  Performance Metrics

- Query Response: <100ms average
- Database Size: 8,865 records
- Uptime: 99.9% on production
- Parallel Capacity: 5 concurrent scrapers

##  Installation

```bash
# Backend setup
cd backend && npm install
node server.js

# Scraping setup  
pip install -r requirements.txt
python scraping/pc1_scraping/sb_audi_auto_restart_clean.py --mercedes

# Environment configuration
cp .env.example .env
# Configure database and proxy credentials
```

##  Development Timeline

**Week 1**: Research & bot detection analysis  
**Week 2**: Proxy implementation & testing  
**Week 3**: Parallel scraping architecture  
**Week 4**: Frontend development & deployment

---

*Developed as a comprehensive demonstration of full-stack development, web scraping expertise, and production deployment capabilities.*
