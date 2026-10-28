const axios = require('axios');
const cheerio = require('cheerio');

async function testBlogSearch() {
    const kw = '백진희 헨리';
    const url = 'https://search.naver.com/search.naver?where=blog&sm=tab_viw.blog&query=' + encodeURIComponent(kw);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const blogs = [];
        
        $('a.title_link, a.api_txt_lines.total_tit, a[class*="title"]').each((i, el) => {
            const title = $(el).text().trim();
            const link = $(el).attr('href');
            if (title && link && link.includes('blog.naver.com')) {
                const parent = $(el).closest('li, .view_wrap, .total_wrap, [class*="item"]');
                const desc = parent.find('.dsc_txt, .total_dsc, [class*="dsc"]').text().trim();
                const author = parent.find('.name, .sub_txt, [class*="name"]').first().text().trim();
                blogs.push({ title, link, author, desc });
            }
        });
        
        console.log('총 수집된 블로그 수:', blogs.length);
        console.log('상위 3개 블로그:', JSON.stringify(blogs.slice(0, 3), null, 2));
    } catch(e) {
        console.error(e);
    }
}
testBlogSearch();
