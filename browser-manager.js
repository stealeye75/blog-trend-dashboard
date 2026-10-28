const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// 사용자 프로필(로그인 쿠키, 세션 등)이 저장될 경로
const USER_DATA_DIR = path.join(__dirname, 'user-data');
if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// Windows Chrome 실제 경로 탐색
function getChromeExecutablePath() {
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

const CHROME_PATH = getChromeExecutablePath();
const DEBUG_PORT = 9222;

// 1. 진짜 크롬 브라우저 독립 창으로 실행 (Windows start 명령어 활용)
async function openLoginBrowser(targetUrl = 'https://creator-advisor.naver.com/naver_blog/steely-eyed/trends') {
    return new Promise((resolve) => {
        try {
            console.log(`[Browser] 진짜 크롬 창 띄우기: ${targetUrl}`);

            if (!CHROME_PATH) {
                return resolve({ success: false, error: '설치된 크롬 브라우저(chrome.exe)를 찾을 수 없습니다.' });
            }

            // cmd.exe start 명령어로 크롬 독립 프로세스 실행
            const { exec } = require('child_process');
            const cmd = `start "" "${CHROME_PATH}" --remote-debugging-port=${DEBUG_PORT} --user-data-dir="${USER_DATA_DIR}" "${targetUrl}"`;

            exec(cmd, (err) => {
                if (err) {
                    console.error('[Browser] 크롬 창 실행 오류:', err);
                    return resolve({ success: false, error: err.message });
                }
                console.log('[Browser] 크롬 창이 성공적으로 화면에 열렸습니다.');
                resolve({ 
                    success: true, 
                    message: '실제 크롬 브라우저가 열렸습니다. 네이버 로그인 후 대시보드에서 수집을 진행하세요.' 
                });
            });
        } catch (err) {
            console.error('[Browser] 크롬 실행 오류:', err);
            resolve({ success: false, error: err.message });
        }
    });
}

// 2. 실행 중인 크롬(CDP)에 연결하거나 새 세션으로 크리에이터 어드바이저 수집
async function scrapeCreatorAdvisor() {
    const targetUrl = 'https://creator-advisor.naver.com/naver_blog/steely-eyed/trends';
    console.log(`[Scraper] 크리에이터 어드바이저 수집 시도: ${targetUrl}`);

    let browser = null;
    let page = null;
    let isConnectedCDP = false;

    try {
        // 먼저 9222 포트로 실행 중인 크롬에 연결 시도
        try {
            browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
            const contexts = browser.contexts();
            const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
            page = await context.newPage();
            isConnectedCDP = true;
            console.log('[Scraper] 실행 중인 크롬(CDP)에 성공적으로 연결되었습니다.');
        } catch (cdpErr) {
            console.log('[Scraper] 기존 크롬 연결 불가 -> headless 번들 Chromium으로 직접 접근');
            // CDP 연결 안 되면 user-data 디렉토리로 직접 실행
            browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
                headless: true,
                viewport: { width: 1440, height: 900 },
                locale: 'ko-KR'
            });
            page = await browser.newPage();
        }

        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(3000);

        // 로그인 페이지나 소개 페이지로 튕겼는지 확인
        const currentUrl = page.url();
        if (currentUrl.includes('nidlogin') || currentUrl.includes('login.naver.com') || currentUrl.includes('introduction')) {
            if (isConnectedCDP) await page.close();
            else await browser.close();

            return {
                status: 'need_login',
                message: '크리에이터 어드바이저 로그인이 필요합니다. [네이버 로그인] 창에서 크리에이터 어드바이저 화면이 나올 때까지 로그인해 주세요.',
                categories: []
            };
        }

        // 전체 주제 카테고리 탭 탐색
        console.log('[Scraper] 카테고리 탭 탐색 중...');
        
        // 탭 버튼 선택자들
        const categoriesData = [];

        // 페이지 내 탭 요소들 가져오기
        const tabSelectors = [
            'button[role="tab"]',
            'ul[role="tablist"] li',
            '.category_tab button',
            '.category_tab a',
            '.tab_item',
            '.tab_list li'
        ];

        let tabs = [];
        for (const sel of tabSelectors) {
            const found = await page.$$(sel);
            if (found.length > 1) {
                tabs = found;
                break;
            }
        }

        console.log(`[Scraper] 발견된 주제 탭 개수: ${tabs.length}`);

        if (tabs.length > 0) {
            for (let i = 0; i < tabs.length; i++) {
                try {
                    // DOM 재평가를 위해 다시 탐색
                    const currentTabs = await page.$$(tabSelectors.find(s => tabs.length > 0) || 'button[role="tab"]');
                    if (!currentTabs[i]) break;

                    const tabName = (await currentTabs[i].innerText()).trim().replace(/\n/g, ' ');
                    if (!tabName || tabName.length > 20) continue;

                    // 탭 클릭
                    await currentTabs[i].click();
                    await page.waitForTimeout(1500);

                    // 해당 탭의 1~10위 키워드 추출
                    const keywords = await extractKeywordsFromPage(page);
                    if (keywords.length > 0) {
                        categoriesData.push({
                            category: tabName,
                            keywords: keywords
                        });
                    }
                } catch (e) {
                    console.log(`[Scraper] 탭 ${i} 클릭 수집 중 예외:`, e.message);
                }
            }
        }

        // 탭이 없거나 수집 안 된 경우 기본 페이지에서 수집
        if (categoriesData.length === 0) {
            const defaultKeywords = await extractKeywordsFromPage(page);
            if (defaultKeywords.length > 0) {
                categoriesData.push({
                    category: '종합 트렌드',
                    keywords: defaultKeywords
                });
            }
        }

        // 브라우저 닫기/정리
        if (isConnectedCDP) {
            await page.close();
            // CDP 브라우저는 사용자가 쓰는 창이므로 닫지 않음
        } else {
            await browser.close();
        }

        return {
            status: categoriesData.length > 0 ? 'success' : 'empty',
            message: categoriesData.length > 0 ? `${categoriesData.length}개 주제 트렌드 수집 완료` : '데이터를 찾지 못했습니다.',
            categories: categoriesData,
            timestamp: new Date().toISOString()
        };

    } catch (err) {
        console.error('[Scraper] 어드바이저 수집 최종 실패:', err);
        try {
            if (page && isConnectedCDP) await page.close();
            else if (browser) await browser.close();
        } catch(e) {}

        return {
            status: 'error',
            message: `수집 실패: ${err.message}`,
            categories: []
        };
    }
}

// 1~10위 키워드 추출 헬퍼 함수
async function extractKeywordsFromPage(page) {
    return await page.evaluate(() => {
        const results = [];
        const rows = document.querySelectorAll('table tbody tr, .trend_list li, .ranking_list li, .keyword_list li, div[class*="ranking"] li');
        
        rows.forEach((row, idx) => {
            if (results.length >= 10) return;
            const text = row.innerText.trim();
            const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
            
            let rank = idx + 1;
            let keyword = '';
            let extra = '';

            if (lines.length >= 2 && !isNaN(parseInt(lines[0]))) {
                rank = parseInt(lines[0]);
                keyword = lines[1];
                extra = lines.slice(2).join(' ');
            } else if (lines.length > 0) {
                keyword = lines[0];
                extra = lines.slice(1).join(' ');
            }

            if (keyword && keyword.length > 1 && keyword.length < 50) {
                results.push({ rank, keyword, extra });
            }
        });

        // 테이블이 아닌 경우 링크나 텍스트 블록
        if (results.length === 0) {
            const els = document.querySelectorAll('span.keyword, .keyword_text, .tit, td a');
            els.forEach((el, idx) => {
                if (results.length >= 10) return;
                const txt = el.innerText.trim();
                if (txt && txt.length > 1 && txt.length < 40 && !results.some(r => r.keyword === txt)) {
                    results.push({
                        rank: results.length + 1,
                        keyword: txt,
                        extra: ''
                    });
                }
            });
        }

        return results.slice(0, 10);
    });
}

module.exports = {
    openLoginBrowser,
    scrapeCreatorAdvisor
};
