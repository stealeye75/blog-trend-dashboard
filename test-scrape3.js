const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

async function main() {
    // 1. Signal.bz API 찾기
    console.log('=== Signal.bz API Tests ===');
    const signalUrls = [
        'https://www.signal.bz/api/trending',
        'https://www.signal.bz/api/keywords',
        'https://www.signal.bz/api/realtime',
        'https://signal.bz/api/trending',
        'https://signal.bz/news/realtime',
    ];
    for (const url of signalUrls) {
        try {
            const r = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            console.log(`[OK] ${url} -> ${r.status}, type=${r.headers['content-type']}`);
            console.log(JSON.stringify(r.data).substring(0, 300));
        } catch(e) {
            console.log(`[FAIL] ${url} -> ${e.response?.status || e.message}`);
        }
    }

    // 2. Signal.bz XHR/Fetch requests - check the page source for API calls
    console.log('\n=== Signal.bz Script Analysis ===');
    try {
        const r = await axios.get('https://www.signal.bz/', { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(r.data);
        $('script').each((i, s) => {
            const src = $(s).attr('src') || '';
            const content = $(s).html() || '';
            if (src) console.log(`  script src: ${src}`);
            if (content.length > 50 && (content.includes('http') || content.includes('fetch') || content.includes('ajax') || content.includes('api'))) {
                console.log(`  inline script (${content.length} chars): ${content.substring(0, 300)}`);
            }
        });
    } catch(e) { console.log('ERROR:', e.message); }
    
    // 3. AdSense Farm - check scripts for API
    console.log('\n=== AdSense Farm Script Analysis ===');
    try {
        const r = await axios.get('https://adsensefarm.kr/realtime/', { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(r.data);
        $('script').each((i, s) => {
            const src = $(s).attr('src') || '';
            const content = $(s).html() || '';
            if (src && !src.includes('google') && !src.includes('analytics')) {
                console.log(`  script src: ${src}`);
            }
            if (content.length > 50) {
                // Look for API URLs or data loading
                const matches = content.match(/https?:\/\/[^\s'"]+/g);
                if (matches) {
                    matches.forEach(m => {
                        if (!m.includes('google') && !m.includes('font')) {
                            console.log(`  found URL: ${m}`);
                        }
                    });
                }
                if (content.includes('fetch') || content.includes('ajax') || content.includes('XMLHttp')) {
                    console.log(`  fetch/ajax script (${content.length} chars):`);
                    console.log(`  ${content.substring(0, 500)}`);
                }
            }
        });
    } catch(e) { console.log('ERROR:', e.message); }

    // 4. Google Trends - try the new trending API
    console.log('\n=== Google Trends API Tests ===');
    const gUrls = [
        'https://trends.google.com/trends/trendingsearches/daily/rss?geo=KR',
        'https://trends.google.co.kr/trends/trendingsearches/daily/rss?geo=KR',
        'https://trends.google.com/trending/rss?geo=KR',
        'https://trends.google.co.kr/trending/rss?geo=KR',
        'https://trends.google.com/trends/api/dailytrends?hl=ko&tz=-540&geo=KR&ns=15',
    ];
    for (const url of gUrls) {
        try {
            const r = await axios.get(url, { headers: {...HEADERS, 'Accept': '*/*'}, timeout: 8000, maxRedirects: 5 });
            console.log(`[OK] ${url}`);
            console.log(`  Status: ${r.status}, Type: ${r.headers['content-type']}, Len: ${String(r.data).length}`);
            const preview = typeof r.data === 'string' ? r.data.substring(0, 300) : JSON.stringify(r.data).substring(0, 300);
            console.log(`  ${preview}`);
        } catch(e) {
            console.log(`[FAIL] ${url} -> ${e.response?.status || e.message}`);
        }
    }

    // 5. Naver Realtime Search / DataLab
    console.log('\n=== Naver API Tests ===');
    const naverUrls = [
        'https://m.search.naver.com/p/csearch/content/qapirender.nhn?where=nexearch&pkid=66&key=AutocompleteRank',
        'https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=%EC%8B%A4%EC%8B%9C%EA%B0%84+%EA%B2%80%EC%83%89%EC%96%B4',
    ];
    for (const url of naverUrls) {
        try {
            const r = await axios.get(url, { headers: HEADERS, timeout: 8000 });
            console.log(`[OK] ${url}`);
            const preview = typeof r.data === 'string' ? r.data.substring(0, 400) : JSON.stringify(r.data).substring(0, 400);
            console.log(`  ${preview}`);
        } catch(e) {
            console.log(`[FAIL] ${url} -> ${e.response?.status || e.message}`);
        }
    }

    // 6. Alternative: Naver's DataLab shopping insight or raw search suggestions
    console.log('\n=== Naver Autocomplete (Search Suggestions) ===');
    try {
        const r = await axios.get('https://ac.search.naver.com/nx/ac', {
            params: { q: '', con: 1, frm: 'nv', ans: 2, r_format: 'json', r_enc: 'UTF-8', r_unicode: 0, t_koreng: 1, run: 2, rev: 4, q_enc: 'UTF-8' },
            headers: HEADERS,
            timeout: 5000
        });
        console.log('Naver autocomplete response:', JSON.stringify(r.data).substring(0, 500));
    } catch(e) { console.log('ERROR:', e.message); }

    // 7. Zum realtime
    console.log('\n=== Zum Realtime ===');
    try {
        const r = await axios.get('https://search.zum.com/search.zum?method=realtime', { headers: HEADERS, timeout: 5000 });
        console.log('Status:', r.status, 'Len:', r.data.length);
        const $ = cheerio.load(r.data);
        $('li, .keyword, a').slice(0, 20).each((i,e) => {
            const text = $(e).text().trim().substring(0, 50);
            if (text && text.length > 1 && text.length < 30) console.log(`  [${i}] "${text}"`);
        });
    } catch(e) { console.log('ERROR:', e.response?.status || e.message); }

    // 8. Daum realtime (if available)
    console.log('\n=== Daum/Kakao Trends ===');
    try {
        const r = await axios.get('https://www.daum.net/', { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(r.data);
        // Look for trending/realtime keywords
        $('[class*=rank], [class*=trend], [class*=keyword], [class*=hot]').slice(0, 20).each((i,e) => {
            const text = $(e).text().trim().substring(0, 60);
            if (text && text.length > 1) console.log(`  [${i}] cls=${$(e).attr('class')}: "${text}"`);
        });
    } catch(e) { console.log('ERROR:', e.message); }
}

main();
