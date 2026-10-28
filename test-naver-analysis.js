const axios = require('axios');
const cheerio = require('cheerio');

async function testNaverSearch() {
    const kw = '백진희 헨리';
    const url = 'https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=' + encodeURIComponent(kw);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
            },
            timeout: 8000
        });
        const $ = cheerio.load(data);
        
        // 1. 블로그/스마트블록/VIEW 글 검색
        const blogItems = [];
        $('.title_link, .api_txt_lines.total_tit, .news_tit').each((i, el) => {
            const title = $(el).text().trim();
            const link = $(el).attr('href');
            if (title && link && !blogItems.some(b => b.title === title)) {
                // 부모나 인접 엘리먼트에서 요약(snippet) 추출
                let snippet = $(el).closest('.total_wrap, .bx, .news_wrap').find('.api_txt_lines.dsc_txt, .news_dsc, .total_dsc').text().trim();
                blogItems.push({ title, link, snippet });
            }
        });

        // 2. 연관 검색어
        const relKeywords = [];
        $('.related_srch .tit, .keyword, a.item').each((i, el) => {
            const rk = $(el).text().trim();
            if (rk && !relKeywords.includes(rk)) relKeywords.push(rk);
        });

        console.log('연관키워드:', relKeywords.slice(0, 10));
        console.log('수집된 상위 글 수:', blogItems.length);
        console.log('상위 3개 글:', JSON.stringify(blogItems.slice(0, 3), null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testNaverSearch();
