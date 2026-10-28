const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
    // 1. Signal.bz app.js 분석 - API 엔드포인트 찾기
    console.log('=== Signal.bz app.js ===');
    try {
        const r = await axios.get('https://www.signal.bz/js/app.4fc8a270.js', { timeout: 10000 });
        const code = r.data;
        console.log('Length:', code.length);
        
        // Find all URLs in the code
        const urlMatches = code.match(/["'](https?:\/\/[^"']+|\/api\/[^"']+|\/[a-z]+\/[a-z]+[^"']*?)["']/gi) || [];
        console.log('\nURLs found in app.js:');
        const seen = new Set();
        urlMatches.forEach(m => {
            const url = m.replace(/^["']|["']$/g, '');
            if (!seen.has(url) && !url.includes('google') && !url.includes('cdn') && !url.includes('.css') && !url.includes('.png') && !url.includes('.svg') && url.length < 200) {
                seen.add(url);
                console.log(`  ${url}`);
            }
        });
        
        // Find fetch/axios calls
        const fetchMatches = code.match(/(?:fetch|axios|get|post|request)\s*\(\s*["'][^"']+["']/gi) || [];
        console.log('\nFetch/Axios calls:');
        fetchMatches.forEach(m => console.log(`  ${m}`));
        
        // Find any "keyword" or "rank" or "trending" related strings
        const kwMatches = code.match(/["'][^"']*(?:keyword|rank|trend|signal|realtime|search)[^"']*["']/gi) || [];
        console.log('\nKeyword/Rank related strings:');
        const seen2 = new Set();
        kwMatches.forEach(m => {
            if (!seen2.has(m) && m.length < 100) {
                seen2.add(m);
                console.log(`  ${m}`);
            }
        });
    } catch(e) { console.log('ERROR:', e.message); }

    // 2. AdSense Farm realtime.js 분석
    console.log('\n=== AdSense Farm realtime.js ===');
    try {
        const r = await axios.get('https://adsensefarm.kr/realtime/realtime.js?v=3', { timeout: 10000 });
        console.log('Length:', r.data.length);
        console.log('\nFull content:');
        console.log(r.data.substring(0, 3000));
    } catch(e) { console.log('ERROR:', e.message); }

    // 3. Google Trends RSS - Parse actual data
    console.log('\n=== Google Trends RSS Parse ===');
    try {
        const r = await axios.get('https://trends.google.com/trending/rss?geo=KR', { timeout: 10000 });
        const $ = cheerio.load(r.data, { xmlMode: true });
        $('item').slice(0, 5).each((i, el) => {
            const title = $(el).find('title').text();
            const traffic = $(el).find('ht\\:approx_traffic').text();
            const newsTitle = $(el).find('ht\\:news_item_title').first().text();
            const newsUrl = $(el).find('ht\\:news_item_url').first().text();
            console.log(`[${i+1}] ${title} (${traffic})`);
            console.log(`    뉴스: ${newsTitle}`);
            console.log(`    URL: ${newsUrl}`);
        });
    } catch(e) { console.log('ERROR:', e.message); }
}

main();
