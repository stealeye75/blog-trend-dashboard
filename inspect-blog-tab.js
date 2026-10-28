const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function inspectBlogTab() {
    const kw = '백진희 헨리';
    const url = 'https://search.naver.com/search.naver?where=blog&sm=tab_viw.blog&query=' + encodeURIComponent(kw);
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9'
        }
    });
    fs.writeFileSync('blog_tab.html', data);
    const $ = cheerio.load(data);
    console.log('HTML size:', data.length);
    console.log('Total a tags:', $('a').length);
    $('a').each((i, el) => {
        const h = $(el).attr('href') || '';
        if (h.includes('blog.naver.com') || h.includes('post.naver.com')) {
            console.log('Blog link found:', $(el).text().trim().slice(0, 50), '->', h);
        }
    });
}
inspectBlogTab();
