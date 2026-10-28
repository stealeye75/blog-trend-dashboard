const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('blog_tab.html', 'utf8');
const $ = cheerio.load(html);

const blogs = [];
const seenUrls = new Set();

// blog.naver.com 링크 중 숫자로 끝나는 실제 포스팅 링크만 선별
$('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('blog.naver.com') && /\/\d+$/.test(href.split('?')[0])) {
        const cleanUrl = href.split('?')[0];
        if (seenUrls.has(cleanUrl)) return;
        
        // 텍스트가 의미있는 제목인지 확인
        let text = $(el).text().trim().replace(/새 창 열림/g, '').trim();
        if (text.length > 10) {
            seenUrls.add(cleanUrl);
            
            // 인접한 본문 요약문 찾기
            let snippet = '';
            // 바로 다음이나 부모 내의 설명문 검색
            const parent = $(el).closest('div, li');
            const snippetCandidate = parent.find('a').filter((_, a) => {
                const t = $(a).text().trim();
                return t.length > 25 && t !== text && !t.includes('새 창 열림');
            }).first().text().trim();
            
            snippet = snippetCandidate || parent.text().replace(text, '').replace(/새 창 열림/g, '').trim().slice(0, 150);
            
            blogs.push({
                rank: blogs.length + 1,
                title: text,
                url: cleanUrl,
                snippet: snippet.slice(0, 150)
            });
        }
    }
});

console.log('추출된 블로그 포스팅 수:', blogs.length);
console.log('상위 5개:', JSON.stringify(blogs.slice(0, 5), null, 2));
