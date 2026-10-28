const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// ===== 1. 다음 실시간 검색어 (AdSenseFarm -> 실패 시 Signal.bz 백업) =====
async function fetchDaumRealtime() {
    try {
        const { data } = await axios.get('https://adsensefarm.kr/realtime/daum.php', {
            headers: { ...HEADERS, 'Referer': 'https://adsensefarm.kr/realtime/' },
            timeout: 5000
        });
        if (data.result === 'success' && Array.isArray(data.data)) {
            return {
                source: '다음 실시간 검색어',
                icon: '🔶',
                color: '#fabc09',
                timestamp: data.nowtime || new Date().toISOString(),
                keywords: data.data.map((kw, i) => ({
                    rank: i + 1,
                    keyword: kw,
                    source: 'daum'
                })),
                status: 'success',
                message: `${data.data.length}개 키워드 수집`
            };
        }
    } catch (e) {
        // 백업: Signal.bz 실시간 API
        try {
            const { data: sig } = await axios.get('https://api.signal.bz/news/realtime', {
                headers: HEADERS,
                timeout: 5000
            });
            if (sig && Array.isArray(sig.top10)) {
                return {
                    source: '실시간 급상승 (Signal)',
                    icon: '🔶',
                    color: '#fabc09',
                    timestamp: new Date().toISOString(),
                    keywords: sig.top10.map((item, i) => ({
                        rank: item.rank || i + 1,
                        keyword: item.keyword,
                        source: 'signal'
                    })),
                    status: 'success',
                    message: `${sig.top10.length}개 실시간 키워드 수집`
                };
            }
        } catch (err) {}
    }
    return makeEmptyResult('다음 실시간 검색어', '🔶', '#fabc09', '실시간 데이터 갱신 중');
}

// ===== 2. 네이버 인기 검색어 (AdSenseFarm -> 실패 시 네이버 랭킹뉴스 백업) =====
async function fetchNaverKeywords() {
    try {
        const { data } = await axios.get('https://adsensefarm.kr/realtime/naver.php', {
            headers: { ...HEADERS, 'Referer': 'https://adsensefarm.kr/realtime/' },
            timeout: 5000
        });
        if (data.result === 'success' && Array.isArray(data.data)) {
            return {
                source: '네이버 인기 검색어',
                icon: '🟢',
                color: '#03c75a',
                timestamp: data.nowtime || new Date().toISOString(),
                keywords: data.data.map((kw, i) => ({
                    rank: i + 1,
                    keyword: kw,
                    source: 'naver_keyword'
                })),
                status: 'success',
                message: `${data.data.length}개 키워드 수집`
            };
        }
    } catch (e) {
        // 백업: 네이버 언론사별 랭킹뉴스 헤드라인에서 추출 (EUC-KR 디코딩 적용)
        try {
            const res = await axios.get('https://news.naver.com/main/ranking/popularDay.naver', {
                headers: HEADERS,
                responseType: 'arraybuffer',
                timeout: 5000
            });
            const decodedHtml = iconv.decode(res.data, 'euc-kr');
            const $ = cheerio.load(decodedHtml);
            const kws = [];
            $('.rankingnews_box .list_title, .rankingnews_box a.list_title').each((i, el) => {
                const title = $(el).text().trim();
                if (title && kws.length < 20 && !kws.includes(title)) {
                    kws.push(title);
                }
            });
            if (kws.length > 0) {
                return {
                    source: '네이버 인기 랭킹',
                    icon: '🟢',
                    color: '#03c75a',
                    timestamp: new Date().toISOString(),
                    keywords: kws.map((kw, i) => ({ rank: i + 1, keyword: kw, source: 'naver_ranking' })),
                    status: 'success',
                    message: `${kws.length}개 랭킹 키워드 수집`
                };
            }
        } catch (err) {}
    }
    return makeEmptyResult('네이버 인기 검색어', '🟢', '#03c75a', '실시간 데이터 갱신 중');
}

// ===== 3. 구글 실시간 검색어 (AdSenseFarm -> 실패 시 Google Trends RSS 백업) =====
async function fetchGoogleRealtime() {
    try {
        const { data } = await axios.get('https://adsensefarm.kr/realtime/googletrend.php', {
            headers: { ...HEADERS, 'Referer': 'https://adsensefarm.kr/realtime/' },
            timeout: 5000
        });
        if (data.result === 'success' && Array.isArray(data.data)) {
            return {
                source: '구글 실시간 검색어',
                icon: '🔵',
                color: '#4285f4',
                timestamp: data.nowtime || new Date().toISOString(),
                keywords: data.data.map((kw, i) => ({
                    rank: i + 1,
                    keyword: kw,
                    source: 'google_realtime'
                })),
                status: 'success',
                message: `${data.data.length}개 키워드 수집`
            };
        }
    } catch (e) {
        // 백업: Google Trends RSS 파싱 결과 활용
        try {
            const { data: rssData } = await axios.get('https://trends.google.com/trending/rss?geo=KR', {
                headers: HEADERS,
                timeout: 5000
            });
            const $ = cheerio.load(rssData, { xmlMode: true });
            const gKws = [];
            $('item').each((i, el) => {
                const title = $(el).find('title').text().trim();
                if (title && !gKws.includes(title)) gKws.push(title);
            });
            if (gKws.length > 0) {
                return {
                    source: '구글 실시간 트렌드',
                    icon: '🔵',
                    color: '#4285f4',
                    timestamp: new Date().toISOString(),
                    keywords: gKws.slice(0, 15).map((kw, i) => ({ rank: i + 1, keyword: kw, source: 'google_rss' })),
                    status: 'success',
                    message: `${Math.min(gKws.length, 15)}개 구글 키워드 수집`
                };
            }
        } catch (err) {}
    }
    return makeEmptyResult('구글 실시간 검색어', '🔵', '#4285f4', '실시간 데이터 갱신 중');
}

// ===== 4. Google Trends RSS 일간 트렌드 =====
async function fetchGoogleTrendsRSS() {
    try {
        const { data } = await axios.get('https://trends.google.com/trending/rss?geo=KR', {
            headers: HEADERS,
            timeout: 10000
        });
        const $ = cheerio.load(data, { xmlMode: true });
        const keywords = [];

        $('item').each((i, el) => {
            const title = $(el).find('title').text().trim();
            const traffic = $(el).find('ht\\:approx_traffic').text().trim();
            const newsTitle = $(el).find('ht\\:news_item_title').first().text().trim();
            const newsUrl = $(el).find('ht\\:news_item_url').first().text().trim();

            if (title) {
                keywords.push({
                    rank: keywords.length + 1,
                    keyword: title,
                    traffic: traffic || '',
                    relatedNews: newsTitle || '',
                    newsUrl: newsUrl || '',
                    source: 'google_trends_rss'
                });
            }
        });

        return {
            source: 'Google Trends 일간',
            icon: '📈',
            color: '#ea4335',
            timestamp: new Date().toISOString(),
            keywords: keywords.slice(0, 20),
            status: keywords.length > 0 ? 'success' : 'partial',
            message: keywords.length > 0 ? `${keywords.length}개 트렌드 수집` : 'RSS 데이터 없음'
        };
    } catch (error) {
        return makeErrorResult('Google Trends 일간', '📈', '#ea4335', error);
    }
}

// ===== 5. 네이버 뉴스 주요 헤드라인 =====
async function fetchNaverNews() {
    try {
        const { data } = await axios.get('https://news.naver.com/', {
            headers: HEADERS,
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const headlines = [];
        const seen = new Set();

        $('strong.cnf_news_title').each((i, el) => {
            const text = $(el).text().trim();
            const parentA = $(el).closest('a');
            const href = parentA.attr('href') || '';

            if (text && text.length > 5 && !seen.has(text)) {
                seen.add(text);
                headlines.push({
                    rank: headlines.length + 1,
                    keyword: text,
                    url: href,
                    source: 'naver_news'
                });
            }
        });

        return {
            source: '네이버 뉴스',
            icon: '📰',
            color: '#03c75a',
            timestamp: new Date().toISOString(),
            keywords: headlines.slice(0, 25),
            status: headlines.length > 0 ? 'success' : 'partial',
            message: headlines.length > 0 ? `${headlines.length}개 뉴스 헤드라인` : '뉴스 구조 변경됨'
        };
    } catch (error) {
        return makeErrorResult('네이버 뉴스', '📰', '#03c75a', error);
    }
}

function makeEmptyResult(source, icon, color, message) {
    return { source, icon, color, timestamp: new Date().toISOString(), keywords: [], status: 'partial', message };
}

function makeErrorResult(source, icon, color, error) {
    return { source, icon, color, timestamp: new Date().toISOString(), keywords: [], status: 'error', message: `수집 실패: ${error.message}` };
}

// ===== API 라우트 =====

// 전체 수집 (지인 접속 시에도 1초 만에 응답)
app.get('/api/collect-all', async (req, res) => {
    const startTime = Date.now();
    const results = await Promise.allSettled([
        fetchDaumRealtime(),
        fetchNaverKeywords(),
        fetchGoogleRealtime(),
        fetchGoogleTrendsRSS(),
        fetchNaverNews()
    ]);

    const data = results.map(r => r.status === 'fulfilled' ? r.value : {
        source: 'Unknown',
        status: 'error',
        message: r.reason?.message || 'Error',
        keywords: [],
        icon: '❓',
        color: '#666'
    });

    const totalKeywords = data.reduce((sum, d) => sum + d.keywords.length, 0);
    const successCount = data.filter(d => d.status === 'success').length;
    const elapsed = Date.now() - startTime;

    res.json({
        timestamp: new Date().toISOString(),
        elapsed,
        totalKeywords,
        successCount,
        totalSources: data.length,
        sources: data
    });
});

// ===== 키워드별 네이버 상위 블로그 데이터 팩 분석 엔드포인트 =====
app.get('/api/analyze-keyword', async (req, res) => {
    const keyword = req.query.keyword;
    if (!keyword) return res.status(400).json({ error: '키워드가 필요합니다.' });

    try {
        const url = `https://search.naver.com/search.naver?where=blog&sm=tab_viw.blog&query=${encodeURIComponent(keyword)}`;
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8'
            },
            timeout: 8000
        });

        const $ = cheerio.load(data);
        const blogs = [];
        const seenUrls = new Set();

        $('a').each((i, el) => {
            const href = $(el).attr('href') || '';
            if (href.includes('blog.naver.com') && /\/\d+$/.test(href.split('?')[0])) {
                const cleanUrl = href.split('?')[0];
                if (seenUrls.has(cleanUrl)) return;
                
                let text = $(el).text().trim().replace(/새 창 열림/g, '').trim();
                if (text.length > 10) {
                    seenUrls.add(cleanUrl);
                    const parent = $(el).closest('div, li');
                    const snippetCandidate = parent.find('a').filter((_, a) => {
                        const t = $(a).text().trim();
                        return t.length > 25 && t !== text && !t.includes('새 창 열림');
                    }).first().text().trim();
                    
                    const snippet = snippetCandidate || parent.text().replace(text, '').replace(/새 창 열림/g, '').trim().slice(0, 160);
                    
                    blogs.push({
                        rank: blogs.length + 1,
                        title: text,
                        url: cleanUrl,
                        snippet: snippet.slice(0, 160)
                    });
                }
            }
        });

        // 상위 5개 추출
        const topBlogs = blogs.slice(0, 5);

        // 연관 키워드 / 주요 단어 빈도 분석
        const allText = topBlogs.map(b => `${b.title} ${b.snippet}`).join(' ');
        const words = allText.match(/[가-힣a-zA-Z0-9]{2,}/g) || [];
        const wordFreq = {};
        const stopWords = new Set(['있는', '하는', '위해', '대한', '통해', '이런', '저런', '출처', '관련', '그리고', '하지만', '있습니다', '합니다', '알려졌습니다']);
        
        for (const w of words) {
            if (!stopWords.has(w) && w.length >= 2) {
                wordFreq[w] = (wordFreq[w] || 0) + 1;
            }
        }
        
        const coreKeywords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        // 젬스 또는 일반 Gemini에 전송할 완성형 올인원 프롬프트 데이터 팩 생성
        // 문장 첫 줄에 @naver-blog-master를 배치하여 붙여넣기 시 해당 스킬이 바로 호출되도록 설정
        const dataPack = `@naver-blog-master
당신은 네이버 블로그 검색 상위 노출(스마트블록, D.I.A+) 전문 에디터입니다.
아래 제공된 [네이버 상위 노출 분석 데이터]를 바탕으로, 즉시 포스팅할 수 있는 고품질 블로그 글을 작성해 주세요.

[네이버 블로그 상위 노출 분석 데이터]
■ 타겟 키워드: ${keyword}
■ 분석 일시: ${new Date().toLocaleString('ko-KR')}
■ 상위 노출 블로그 포스팅 (1~${topBlogs.length}위):
${topBlogs.map(b => `${b.rank}위. [제목] ${b.title}\n   [핵심 요약] ${b.snippet}\n   [URL] ${b.url}`).join('\n\n')}

■ 빈출 핵심 키워드: ${coreKeywords.map(k => `${k.word}(${k.count}회)`).join(', ')}

[작성 가이드라인]
1. 제목: 클릭을 부르는 매력적인 추천 제목 3가지 제안 (핵심 키워드 전진 배치)
2. 본문 구조:
   - 도입부: 인사 및 오늘 다룰 이슈와 독자 공감대 형성
   - 소제목(##) 3~4개로 나누어 사실 관계, 핵심 쟁점, 파급 영향/전망 구체적 서술
   - 스마트폰 모바일 가독성을 위해 2~3문장마다 줄바꿈 적용 및 이모지(✨, 📌, 💡, 🔍) 활용
   - 마무리: 핵심 한 줄 요약 및 독자 댓글 소통 유도
3. 추천 태그: #키워드 8~10개 제안`;

        // 블로그 삽입용 AI 이미지 생성 프롬프트 세트 (3:4 대표 썸네일 1개 + 16:9 본문 이미지 4개 = 총 5개 프롬프트)
        const topKeywordsStr = coreKeywords.slice(0, 5).map(k => k.word).join(', ');
        const subBlog1 = topBlogs[0]?.title || keyword;
        const subBlog2 = topBlogs[1]?.title || `${keyword} 현장 및 핵심 쟁점`;
        const subBlog3 = topBlogs[2]?.title || `${keyword} 데이터 분석 및 배경`;
        const subBlog4 = topBlogs[3]?.title || `${keyword} 향후 전망과 파급 영향`;

        const imagePromptsList = [
            {
                id: 1,
                name: "대표 썸네일 (3:4)",
                ratio: "3:4",
                desc: "네이버 모바일 피드 최적화 대표 썸네일",
                prompt: `A striking, highly engaging 3:4 portrait thumbnail illustration representing "${keyword}". Theme highlights: ${topKeywordsStr}. Dramatic cinematic lighting, bold visual focal point, ultra-detailed 8k, photorealistic magazine cover style, no text, clean aesthetic --ar 3:4`
            },
            {
                id: 2,
                name: "본문1 사건/현장 (16:9)",
                ratio: "16:9",
                desc: "사건 배경 및 현장 묘사용 와이드 컷",
                prompt: `A wide-angle cinematic 16:9 editorial photo depicting the scene and context of "${subBlog1}". Professional photojournalism style, realistic atmospheric lighting, 8k resolution, documentary photography --ar 16:9`
            },
            {
                id: 3,
                name: "본문2 핵심 쟁점 (16:9)",
                ratio: "16:9",
                desc: "핵심 쟁점 및 개념 설명용 컷",
                prompt: `A modern infographic-style or conceptual 16:9 illustration explaining "${subBlog2}". High-tech clean composition, subtle depth of field, balanced editorial color grading, 8k --ar 16:9`
            },
            {
                id: 4,
                name: "본문3 데이터/영향 (16:9)",
                ratio: "16:9",
                desc: "사회적 영향 및 여론 반응 분석용 컷",
                prompt: `A realistic 16:9 editorial image illustrating the social impact and discussions surrounding "${subBlog3}". Dynamic atmosphere, depth, contemporary journalism photo style, 8k --ar 16:9`
            },
            {
                id: 5,
                name: "본문4 향후 전망 (16:9)",
                ratio: "16:9",
                desc: "향후 전망 및 마무리 시네마틱 컷",
                prompt: `A thoughtful, narrative-driven 16:9 cinematic shot portraying the future perspective and societal outcome of "${subBlog4}". Golden hour soft lighting, high-end commercial editorial quality, photorealistic --ar 16:9`
            }
        ];

        const imagePrompt = `[블로그 대표 썸네일 & 본문 AI 이미지 프롬프트 세트]
※ 아래 개별 번호 버튼(1~5)을 누르면 각 프롬프트만 즉시 복사됩니다.

` + imagePromptsList.map(item => `■ ${item.id}. ${item.name} (${item.desc})\nPrompt: ${item.prompt}`).join('\n\n');

        res.json({
            keyword,
            topBlogs,
            coreKeywords,
            dataPack,
            imagePrompt,
            imagePromptsList,
            naverSearchUrl: `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${encodeURIComponent(keyword)}`
        });
    } catch (error) {
        console.error('[Analyze] 키워드 분석 실패:', error.message);
        res.status(500).json({
            error: '상위 블로그 분석 실패',
            message: error.message,
            keyword,
            naverSearchUrl: `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${encodeURIComponent(keyword)}`
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/multi', (req, res) => {
    res.sendFile(path.join(__dirname, 'multi-browser.html'));
});

// ===== iframe 차단 해제용 스트리밍 프록시 =====
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL이 필요합니다.');

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            responseType: 'text',
            timeout: 15000,
            maxRedirects: 5
        });

        // iframe 차단 헤더 제거
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.header('Access-Control-Allow-Origin', '*');

        let html = response.data;
        if (typeof html === 'string') {
            // 원본 링크 및 리소스들이 정상 동작하도록 <base> 태그 및 링크 _blank 타겟 설정 주입
            const urlObj = new URL(targetUrl);
            const baseTag = `<base href="${urlObj.origin}${urlObj.pathname}">`;
            
            // 페이지 내부의 링크를 클릭했을 때 자연스럽게 새 탭으로 열리도록 base target 추가
            const headInjection = `${baseTag}<base target="_blank">`;
            
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${headInjection}`);
            } else if (html.includes('<HEAD>')) {
                html = html.replace('<HEAD>', `<HEAD>${headInjection}`);
            } else {
                html = headInjection + html;
            }
        }

        res.send(html);
    } catch (err) {
        console.error(`[Proxy] 프록시 실패 (${targetUrl}):`, err.message);
        res.status(500).send(`
            <div style="font-family:sans-serif;padding:30px;text-align:center;color:#666;">
                <h3>사이트를 불러올 수 없습니다.</h3>
                <p>${err.message}</p>
                <a href="${targetUrl}" target="_blank" style="display:inline-block;margin-top:10px;padding:8px 16px;background:#00d4ff;color:#000;text-decoration:none;border-radius:4px;font-weight:bold;">새 탭으로 열기</a>
            </div>
        `);
    }
});

// 로컬 IP 주소 계산 (지인 공유용)
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIp = getLocalIpAddress();

// 0.0.0.0 으로 바인딩하여 같은 와이파이/네트워크 지인 접속 허용
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════╗');
    console.log('  ║   📊 블로그 트렌드 대시보드 (공유 모드)                ║');
    console.log('  ╠══════════════════════════════════════════════════════╣');
    console.log(`  ║   🏠 내 PC 접속:    http://localhost:${PORT}             ║`);
    console.log(`  ║   👥 지인 공유 링크: http://${localIp}:${PORT}       ║`);
    console.log(`  ║   📑 멀티브라우저:   http://${localIp}:${PORT}/multi ║`);
    console.log('  ╚══════════════════════════════════════════════════════╝');
    console.log('');
});
