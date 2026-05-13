import { chromium } from "playwright-extra";
import type { Page, ElementHandle } from "playwright";
import { exec } from "child_process"; // ✅ OS 명령어 실행을 위한 Node.js 내장 모듈 추가

const NOVEL_LIST_URL = "https://novel.munpia.com/564807";

// === 사람의 불규칙성을 모방하는 상수 ===
const PAGE_LOAD_MIN_MS = 6000;
const PAGE_LOAD_MAX_MS = 12000;
const BETWEEN_ACTIONS_MIN_MS = 800;
const BETWEEN_ACTIONS_MAX_MS = 2500;

async function randomSleep(min: number, max: number) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(r => setTimeout(r, ms));
}

// (인간적인 마우스 이동 함수 - 기존과 동일)
async function humanMouseMove(page: Page) {
    const viewport = page.viewportSize();
    if (!viewport) return;
    let currentX = viewport.width / 2;
    let currentY = viewport.height / 2;
    const moves = Math.floor(Math.random() * 3) + 2; 
    for (let i = 0; i < moves; i++) {
        const targetX = Math.floor(Math.random() * (viewport.width - 100)) + 50;
        const targetY = Math.floor(Math.random() * (viewport.height - 100)) + 50;
        const cpX = currentX + (targetX - currentX) * Math.random();
        const cpY = currentY + (targetY - currentY) * Math.random() + (Math.random() > 0.5 ? 100 : -100);
        const steps = Math.floor(Math.random() * 20) + 10;
        for (let t = 1; t <= steps; t++) {
            const time = t / steps;
            const x = Math.pow(1 - time, 2) * currentX + 2 * (1 - time) * time * cpX + Math.pow(time, 2) * targetX;
            const y = Math.pow(1 - time, 2) * currentY + 2 * (1 - time) * time * cpY + Math.pow(time, 2) * targetY;
            await page.mouse.move(x, y);
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 5) + 2)); 
        }
        await randomSleep(50, 150); 
        currentX = targetX;
        currentY = targetY;
    }
}

// (인간적인 스크롤 함수 - 기존과 동일)
async function humanScroll(page: Page) {
    const scrollCount = Math.floor(Math.random() * 4) + 2; 
    for (let i = 0; i < scrollCount; i++) {
        const distance = Math.floor(Math.random() * 300) + 100;
        const chunks = Math.floor(Math.random() * 5) + 5; 
        const chunkDistance = distance / chunks;
        for (let j = 0; j < chunks; j++) {
            await page.mouse.wheel(0, chunkDistance);
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 10) + 10)); 
        }
        await randomSleep(800, 2000); 
    }
}

// ✅ OS 명령어로 순정 Edge 브라우저 켜기
async function launchEdgeManually() {
    return new Promise<void>((resolve, reject) => {
        console.log("🚀 Windows 명령어를 통해 순정 Edge 브라우저를 실행합니다...");
        
        const command = `start msedge.exe --remote-debugging-port=9222 --user-data-dir="C:\\EdgeDebug" "${NOVEL_LIST_URL}"`;
        
        // ✅ 에러 7006 해결: error 변수에 'Error 또는 null' 타입을 명시적으로 지정
        exec(command, (error: Error | null) => {
            if (error) {
                console.error("❌ 브라우저 실행 실패:", error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

async function runConnectedMacro() {
    try {
        // 1. 브라우저를 코드가 대신 켭니다.
        await launchEdgeManually();
        
        // 2. 브라우저가 완전히 켜지고 문피아 페이지가 로딩될 때까지 여유롭게 8초 대기합니다.
        console.log("⏳ 브라우저와 페이지 로딩을 위해 8초 대기합니다...");
        await new Promise(r => setTimeout(r, 8000));

        console.log("\n🔗 열려있는 브라우저의 디버깅 포트에 접속(Connect)합니다...");
        let browser;

        try {
            // 3. Playwright를 통한 스파이 접속 (launch가 아닌 connect)
            browser = await chromium.connectOverCDP("http://localhost:9222");
            const contexts = browser.contexts();
            const page = contexts[0].pages()[0];

            await page.bringToFront();
            console.log(`✅ 현재 탭 주소 확인 완료: ${page.url()}`);
            
            // --- 이 아래부터는 기존과 완벽하게 동일한 크롤링 및 열람 로직 ---
            console.log("🔍 화면 내의 챕터 링크(URL)를 수집합니다...");
            const chapterUrls = await page.$$eval('#ENTRIES tr:not(.notice) td.subject a', (elements: Element[]) => {
                return elements.map(el => (el as HTMLAnchorElement).href);
            });

            if (chapterUrls.length === 0) {
                console.error("❌ 챕터 링크를 찾지 못했습니다. 목록 페이지가 아닙니다.");
                await browser.close();
                return;
            }

            console.log(`✅ 총 ${chapterUrls.length}개의 챕터 주소를 확보했습니다.`);
            const sortedUrls = chapterUrls.reverse(); 

            for (let i = 0; i < sortedUrls.length; i++) {
                try {
                    const currentUrl = sortedUrls[i];
                    console.log(`\n▶ [${i + 1}/${sortedUrls.length}] 챕터 클릭을 시도합니다...`);

                    const chapterElement = await page.evaluateHandle((urlToFind) => {
                        const links = Array.from(document.querySelectorAll('#ENTRIES td.subject a'));
                        return links.find(a => (a as HTMLAnchorElement).href === urlToFind);
                    }, currentUrl) as ElementHandle<Element> | null;

                    if (!chapterElement || !(await chapterElement.isVisible())) {
                        console.error("❌ 현재 페이지에서 해당 챕터 요소를 찾지 못했습니다.");
                        continue;
                    }

                    await chapterElement.scrollIntoViewIfNeeded();
                    await randomSleep(500, 1000);

                    const boundingBox = await chapterElement.boundingBox();
                    if (boundingBox) {
                        await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2, { steps: 10 });
                        await randomSleep(100, 300);
                        await page.mouse.click(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
                    } else {
                        await chapterElement.click(); 
                    }

                    await page.waitForLoadState("domcontentloaded");
                    await randomSleep(BETWEEN_ACTIONS_MIN_MS, BETWEEN_ACTIONS_MAX_MS);

                    await humanMouseMove(page);
                    await humanScroll(page);
                    
                    console.log(`📖 글을 읽고 있습니다...`);
                    await randomSleep(PAGE_LOAD_MIN_MS, PAGE_LOAD_MAX_MS);

                    console.log("  ↩️ 목록 페이지로 뒤로 가기...");
                    await page.goBack({ waitUntil: "domcontentloaded" });
                    
                    await randomSleep(2000, 4000); 

                } catch (error) {
                    console.error(`\n❌ [${i + 1}번째 챕터] 진행 중 오류 발생. 다음으로 넘어갑니다:`, error);
                    continue; 
                }
            }

        } catch (error) {
            console.error("🚨 브라우저 CDP 연결 실패!", error);
        } finally {
            if (browser) {
                console.log("\n🛑 스크립트 연결을 해제합니다.");
                await browser.close(); 
            }
        }

    } catch (error) {
        console.error("🚨 치명적 에러 발생:", error);
    }
}

runConnectedMacro();