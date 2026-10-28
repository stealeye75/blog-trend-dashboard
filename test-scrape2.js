const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

async function main() {
    // 1. Signal.bz
    console.log('\n=== SIGNAL.BZ ===');
    try {
        const r = await axios.get('https://www.signal.bz/', { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(r.data);
        console.log('All IDs:', $('[id]').map((i,e) => $(e).attr('id')).get().join(', '));
        console.log('\nAll tag a texts (first 30):');
        $('a').slice(0, 30).each((i,e) => {
            const text = $(e).text().trim();
            const href = $(e).attr('href') || '';
            if (text) console.log(`  [${i}] "${text}" -> ${href}`);
        });
        
        // Look for list items with numbers
        console.log('\nall ol/ul li:');
        $('li').each((i,e) => {
            const text = $(e).text().trim().substring(0, 80);
            if (text && i < 30) console.log(`  [${i}] "${text}"`);
        });
        
        // Look for tables
        console.log('\ntable structure:');
        $('table').each((i,t) => {
            console.log(`  table[${i}] class="${$(t).attr('class')}"`);
            $(t).find('tr').slice(0, 5).each((j,r) => {
                console.log(`    tr[${j}]: "${$(r).text().trim().substring(0, 100)}"`);
            });
        });

        // Check for script tags with JSON data
        console.log('\nscript data:');
        $('script').each((i,e) => {
            const content = $(e).html() || '';
            if (content.includes('keyword') || content.includes('rank') || content.includes('trend')) {
                console.log(`  script[${i}]: contains keyword/rank/trend data (${content.length} chars)`);
                console.log(`    preview: ${content.substring(0, 300)}`);
            }
        });
    } catch(e) { console.log('ERROR:', e.message); }

    // 2. Google Trends - try different URLs
    console.log('\n=== GOOGLE TRENDS ===');
    const gUrls = [
        'https://trends.google.co.kr/trends/trendingsearches/daily/rss?geo=KR',
        'https://trends.google.com/trends/trendingsearches/daily/rss?geo=KR',
        'https://trends.google.co.kr/trending/rss?geo=KR',
        'https://trends.google.com/trending/rss?geo=KR'
    ];
    for (const url of gUrls) {
        try {
            const r = await axios.get(url, { headers: HEADERS, timeout: 10000 });
            console.log(`\n[OK] ${url}`);
            console.log('Status:', r.status, 'Length:', r.data.length);
            console.log('Preview:', (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)).substring(0, 500));
            const $ = cheerio.load(r.data, { xmlMode: true });
            const items = $('item');
            console.log('Items found:', items.length);
            items.slice(0, 3).each((i,e) => {
                console.log(`  title: "${$(e).find('title').text()}"`);
            });
            break; // if successful, stop trying
        } catch(e) {
            console.log(`[FAIL] ${url}: ${e.message}`);
        }
    }

    // 3. Naver News - find headlines
    console.log('\n=== NAVER NEWS ===');
    try {
        const r = await axios.get('https://news.naver.com/', { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(r.data);
        
        // Try finding strong tags that look like headlines
        console.log('strong tags with headline-like content:');
        $('strong').each((i,e) => {
            const text = $(e).text().trim();
            if (text.length > 10 && text.length < 100) {
                const cls = $(e).attr('class') || '';
                const parentTag = $(e).parent().prop('tagName');
                const parentCls = $(e).parent().attr('class') || '';
                console.log(`  [${i}] cls="${cls}" parent="${parentTag}.${parentCls}" -> "${text}"`);
            }
        });
        
        // Look for news headline specific classes
        console.log('\nClasses containing "headline" or "title" or "tit":');
        $('[class*=headline], [class*=title], [class*=_tit], [class*=_text]').slice(0, 20).each((i,e) => {
            const text = $(e).text().trim().substring(0, 80);
            const cls = $(e).attr('class');
            if (text.length > 5) console.log(`  [${i}] .${cls} -> "${text}"`);
        });
    } catch(e) { console.log('ERROR:', e.message); }

    // 4. AdSense Farm - understand API/structure
    console.log('\n=== ADSENSE FARM ===');
    try {
        const r = await axios.get('https://adsensefarm.kr/realtime/', { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(r.data);
        
        // The site has div.item sections with h2 headers and .innerbox with keywords
        $('div.item').each((i, item) => {
            const title = $(item).find('h2').text().trim();
            console.log(`\n[${title}]`);
            $(item).find('.innerbox p').each((j, p) => {
                const rank = $(p).find('span:not(.keyword)').text().trim();
                const kw = $(p).find('.keyword').text().trim();
                if (kw && kw !== '-') console.log(`  ${rank}. ${kw}`);
            });
        });
        
        // Check for JS that loads data
        $('script').each((i, s) => {
            const content = $(s).html() || '';
            if (content.includes('fetch') || content.includes('ajax') || content.includes('XMLHttpRequest') || content.includes('api')) {
                console.log(`\n[Script with fetch/ajax] (${content.length} chars):`);
                console.log(content.substring(0, 500));
            }
        });
    } catch(e) { console.log('ERROR:', e.message); }
}

main();
