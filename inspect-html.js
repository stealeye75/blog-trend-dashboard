const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function inspectHtml() {
    const kw = '백진희';
    const url = 'https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=' + encodeURIComponent(kw);
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });
    fs.writeFileSync('naver_sample.html', data);
    console.log('Saved naver_sample.html, size:', data.length);
}
inspectHtml();
