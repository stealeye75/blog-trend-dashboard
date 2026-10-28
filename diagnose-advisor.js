const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const USER_DATA_DIR = path.join(__dirname, 'user-data');
const targetUrl = 'https://creator-advisor.naver.com/naver_blog/steely-eyed/trends';

async function diagnose() {
    console.log('=== 크리에이터 어드바이저 페이지 진단 ===');
    let browser = null;
    let page = null;
    try {
        // CDP 또는 launchPersistentContext
        try {
            browser = await chromium.connectOverCDP('http://localhost:9222');
            const contexts = browser.contexts();
            const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
            page = await context.newPage();
            console.log('CDP 연결 성공');
        } catch(e) {
            console.log('CDP 연결 실패 -> launchPersistentContext 시도');
            browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
                headless: true,
                locale: 'ko-KR'
            });
            page = await browser.newPage();
        }

        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(4000);

        console.log('최종 URL:', page.url());
        console.log('페이지 타이틀:', await page.title());

        // 스크린샷 저장
        const screenshotPath = path.join(__dirname, 'advisor-page.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('스크린샷 저장됨:', screenshotPath);

        // 페이지 텍스트 구조 분석
        const analysis = await page.evaluate(() => {
            const result = {
                buttons: [],
                tabs: [],
                tables: [],
                headings: [],
                textSample: document.body.innerText.substring(0, 2000)
            };

            document.querySelectorAll('button').forEach((b, i) => {
                const t = b.innerText.trim();
                if (t && t.length < 30) result.buttons.push(`[${i}] ${t} (class="${b.className}")`);
            });

            document.querySelectorAll('[role="tab"], li[class*="tab"], .tab, a[class*="tab"]').forEach((t, i) => {
                result.tabs.push(`[${i}] ${t.innerText.trim()} (class="${t.className}")`);
            });

            document.querySelectorAll('h1, h2, h3, h4, strong').forEach((h, i) => {
                const t = h.innerText.trim();
                if (t && t.length < 50 && i < 20) result.headings.push(`[${h.tagName}] ${t}`);
            });

            return result;
        });

        console.log('\n--- 텍스트 샘플 ---');
        console.log(analysis.textSample);

        console.log('\n--- 발견된 버튼들 ---');
        console.log(analysis.buttons.slice(0, 25).join('\n'));

        console.log('\n--- 발견된 탭들 ---');
        console.log(analysis.tabs.slice(0, 25).join('\n'));

        console.log('\n--- 헤딩들 ---');
        console.log(analysis.headings.join('\n'));

        if (browser.close) await browser.close();
    } catch(err) {
        console.error('진단 실패:', err);
        if (browser && browser.close) await browser.close().catch(() => {});
    }
}

diagnose();
