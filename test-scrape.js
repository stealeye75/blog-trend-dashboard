const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

async function testSite(name, url) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${name}] ${url}`);
    console.log('='.repeat(60));
    try {
        const r = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        console.log('STATUS:', r.status);
        console.log('CONTENT-TYPE:', r.headers['content-type']);
        console.log('DATA LENGTH:', r.data.length);
        
        const data = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
        
        // Show first 3000 chars
        console.log('\n--- FIRST 3000 CHARS ---');
        console.log(data.substring(0, 3000));
        
        // Try to find keyword-like elements
        if (typeof r.data === 'string') {
            const $ = cheerio.load(r.data);
            
            console.log('\n--- STRUCTURE ANALYSIS ---');
            
            // Check common list structures
            const selectors = [
                'ol li', 'ul li a', 'table tr td', '.rank', '.keyword',
                'a[class*=rank]', 'a[class*=keyword]', 'a[class*=trend]',
                'span[class*=rank]', 'span[class*=keyword]',
                'div[class*=rank]', 'div[class*=keyword]', 'div[class*=item]',
                '.list-group-item', '.card-title', 'h2 a', 'h3 a',
                'strong', '.title', '.tit', '.news_tit',
                'a.cjs_news_a', '.cjs_t', '.sa_text_title',
                '.cluster_text_headline', '.cluster_text_summary',
                '.rankingnews_box a', '.ofp_channel_card a',
                'script[type="application/json"]',
                '#__NEXT_DATA__'
            ];
            
            for (const sel of selectors) {
                const count = $(sel).length;
                if (count > 0) {
                    console.log(`  ${sel}: ${count} elements`);
                    // Show first 3 items
                    $(sel).slice(0, 3).each((i, el) => {
                        const text = $(el).text().trim().substring(0, 100);
                        if (text) console.log(`    [${i}] "${text}"`);
                    });
                }
            }
            
            // Show all classes used
            const classes = new Set();
            $('[class]').each((i, el) => {
                const cls = $(el).attr('class');
                if (cls) cls.split(/\s+/).forEach(c => classes.add(c));
            });
            console.log('\n--- ALL CSS CLASSES (first 50) ---');
            console.log([...classes].slice(0, 50).join(', '));
            
            // Show all IDs
            const ids = [];
            $('[id]').each((i, el) => {
                ids.push($(el).attr('id'));
            });
            if (ids.length > 0) {
                console.log('\n--- ALL IDS ---');
                console.log(ids.slice(0, 30).join(', '));
            }
        }
    } catch(e) {
        console.log('ERROR:', e.message);
        if (e.response) {
            console.log('RESPONSE STATUS:', e.response.status);
            console.log('RESPONSE DATA (first 1000):', 
                typeof e.response.data === 'string' ? e.response.data.substring(0, 1000) : JSON.stringify(e.response.data).substring(0, 1000));
        }
    }
}

async function main() {
    await testSite('Signal.bz', 'https://www.signal.bz/');
    await testSite('Google Trends RSS', 'https://trends.google.co.kr/trends/trendingsearches/daily/rss?geo=KR');
    await testSite('Google Trends Realtime', 'https://trends.google.co.kr/trending?geo=KR');
    await testSite('AdSense Farm', 'https://adsensefarm.kr/realtime/');
    await testSite('Naver News', 'https://news.naver.com/');
}

main();
