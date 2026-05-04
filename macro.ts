import { keyboard, Key, sleep } from "@nut-tree-fork/nut-js";

// === ⚙️ 수정 및 유지보수 변수 ===
const TOTAL_CHAPTERS = 14; 
const SHIFT_TAB_TO_FIRST = 32; 
const START_DELAY = 5000;

// 인간적인 행동 패턴을 위한 시간 범위 설정 (밀리초 단위)
const PAGE_LOAD_MIN_MS = 5000;  
const PAGE_LOAD_MAX_MS = 8500;  
const BACK_NAV_MIN_MS = 3000;   
const BACK_NAV_MAX_MS = 4500;   

// 무작위 대기 시간 생성 함수
async function randomSleep(min: number, max: number) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await sleep(delay);
}

async function runSafeShiftTabMacro() {
    console.log(`${START_DELAY / 1000}초 뒤에 매크로를 시작합니다.`);
    await sleep(START_DELAY);

    const shiftTabToLatest = SHIFT_TAB_TO_FIRST + TOTAL_CHAPTERS - 1;

    for (let currentTab = SHIFT_TAB_TO_FIRST; currentTab <= shiftTabToLatest; currentTab++) {
        console.log(`\n목표: Shift+Tab [${currentTab}]회 이동 중...`);
        
        // 1. Shift 키를 누름 (이 동작 전후에도 미세한 랜덤 지연 추가)
        await randomSleep(100, 300);
        await keyboard.pressKey(Key.LeftShift);

        for (let t = 0; t < currentTab; t++) {
            // 2. 키를 누르기 전 '망설임' 시뮬레이션
            await randomSleep(5, 15); 
            await keyboard.pressKey(Key.Tab);
            
            // 3. 키를 '누르고 있는 시간' 랜덤화 (물리적 타건 모방)
            await randomSleep(20, 50); 
            await keyboard.releaseKey(Key.Tab);
            
            // 4. 다음 타자로 넘어가기 전 간격 랜덤화
            await randomSleep(15, 45); 
        }

        // 5. 모든 입력 후 Shift 키를 뗌
        await keyboard.releaseKey(Key.LeftShift);
        await randomSleep(200, 500); 

        // 게시글 진입
        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);

        console.log("페이지 체류 중...");
        await randomSleep(PAGE_LOAD_MIN_MS, PAGE_LOAD_MAX_MS);

        console.log("목록으로 복귀...");
        await keyboard.pressKey(Key.LeftAlt, Key.Left);
        await keyboard.releaseKey(Key.LeftAlt, Key.Left);
        
        await randomSleep(BACK_NAV_MIN_MS, BACK_NAV_MAX_MS); 
    }
    
    console.log("\n✅ 모든 보안 수칙이 적용된 조회가 완료되었습니다.");
}

runSafeShiftTabMacro().catch(console.error);