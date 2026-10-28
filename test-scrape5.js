const axios = require('axios');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Accept': 'application/json, */*'
};

async function main() {
    // Signal.bz API
    console.log('=== Signal.bz API ===');
    const signalEndpoints = [
        'https://api.signal.bz/',
        'https://api.signal.bz/keywords',
        'https://api.signal.bz/trending',
        'https://api.signal.bz/realtime',
        'https://api.signal.bz/rank',
        'https://api.signal.bz/news',
        'https://api.signal.bz/v1/keywords',
        'https://api.signal.bz/v1/trending',
        'https://api.signal.bz/signal',
    ];
    for (const url of signalEndpoints) {
        try {
            const r = await axios.get(url, { 
                headers: {...HEADERS, 'Origin': 'https://www.signal.bz', 'Referer': 'https://www.signal.bz/'},
                timeout: 5000 
            });
            console.log(`[OK ${r.status}] ${url}`);
            const data = typeof r.data === 'string' ? r.data.substring(0, 500) : JSON.stringify(r.data).substring(0, 500);
            console.log(`  ${data}`);
        } catch(e) {
            console.log(`[${e.response?.status || 'ERR'}] ${url}`);
            if (e.response?.data) {
                const data = typeof e.response.data === 'string' ? e.response.data.substring(0, 200) : JSON.stringify(e.response.data).substring(0, 200);
                console.log(`  ${data}`);
            }
        }
    }

    // AdSense Farm PHP APIs
    console.log('\n=== AdSense Farm APIs ===');
    const adSenseEndpoints = [
        'https://adsensefarm.kr/realtime/daum.php',
        'https://adsensefarm.kr/realtime/nate.php',
        'https://adsensefarm.kr/realtime/googletrend.php',
        'https://adsensefarm.kr/realtime/naver.php',
        'https://adsensefarm.kr/realtime/google.php',
        'https://adsensefarm.kr/realtime/zum.php',
    ];
    for (const url of adSenseEndpoints) {
        try {
            const r = await axios.get(url, { 
                headers: {...HEADERS, 'Referer': 'https://adsensefarm.kr/realtime/'},
                timeout: 5000 
            });
            console.log(`[OK ${r.status}] ${url}`);
            const data = typeof r.data === 'string' ? r.data.substring(0, 500) : JSON.stringify(r.data).substring(0, 500);
            console.log(`  ${data}`);
        } catch(e) {
            console.log(`[${e.response?.status || 'ERR'}] ${url}`);
        }
    }
}

main();
