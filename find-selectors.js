const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('naver_sample.html', 'utf8');
const $ = cheerio.load(html);

console.log('--- Links with blog or post ---');
$('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if ((href.includes('blog.naver.com') || href.includes('in.naver.com') || href.includes('news.naver.com')) && text.length > 5) {
        console.log(`[${$(el).attr('class')}] ${text.slice(0, 40)} -> ${href.slice(0, 60)}`);
    }
});

console.log('\n--- Title elements ---');
$('[class*="title"], [class*="tit"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 80) {
        console.log(`Class: ${$(el).attr('class')} | Text: ${text}`);
    }
});
