// --- LANGUAGE SYSTEM ---
let currentLanguage = 'en';

const translations = {
    en: {
        gameTitle: 'Quoridor 3D',
        gameDescription: 'Reach the other side before your opponent!',
        player1Walls: 'Player 1: {0} walls',
        player2Walls: 'Player 2: {0} walls',
        playerVsAI: 'Player vs AI: {0} walls',
        aiThinking: 'AI is thinking...',
        loadingModels: 'Loading models...',
        playerTurn: 'Player {0} turn',
        aiTurn: 'AI turn',
        chooseMove: 'Choose where to move',
        wallStep1: 'Step 1: Choose first wall segment (orange)',
        wallStep2: 'Step 2: Choose adjacent second wall segment (green)',
        winner: ' Player {0} wins! ',
        aiWinner: ' AI wins! ',
        playerWinner: ' You win! ',
        moveBtn: 'Move',
        wallBtn: 'Wall',
        wallStepBtn: 'Step {0}/2',
        cancelWallBtn: 'Cancel Wall',
        newGameBtn: 'New Game',
        pvpBtn: 'Player vs Player',
        pvcBtn: 'Player vs AI',
        pvpSubtitle: 'Play against a friend',
        pvcSubtitle: 'Challenge the computer',
        easyBtn: 'Easy',
        mediumBtn: 'Medium',
        hardBtn: 'Hard',
        easyDesc: 'Relaxed gameplay',
        mediumDesc: 'Balanced challenge',
        hardDesc: 'Expert level',
        gameModeTitle: 'Game Mode',
        difficultyTitle: 'Choose AI Difficulty',
        startGameBtn: 'Start Game',
        mobileHelp: 'Tap to move • Double-tap to switch modes',
        languageToggle: '🌐 עברית'
    },
    he: {
        gameTitle: 'קורידור תלת מימד',
        gameDescription: 'הגע לצד השני לפני היריב!',
        player1Walls: 'שחקן 1: {0} חומות',
        player2Walls: 'שחקן 2: {0} חומות',
        playerVsAI: 'שחקן נגד מחשב: {0} חומות',
        aiThinking: 'המחשב חושב...',
        loadingModels: 'טוען דמויות...',
        playerTurn: 'תור שחקן {0}',
        aiTurn: 'תור המחשב',
        chooseMove: 'בחר לאן לזוז',
        wallStep1: 'שלב 1: בחר מיקום לחלק הראשון של החומה (כתום)',
        wallStep2: 'שלב 2: בחר מיקום סמוך לחלק השני של החומה (ירוק)',
        winner: ' שחקן {0} ניצח! ',
        aiWinner: ' המחשב ניצח! ',
        playerWinner: ' ניצחת! ',
        moveBtn: 'תנועה',
        wallBtn: 'חומה',
        wallStepBtn: 'שלב {0}/2',
        cancelWallBtn: 'בטל חומה',
        newGameBtn: 'משחק חדש',
        pvpBtn: 'שחקן נגד שחקן',
        pvcBtn: 'שחקן נגד מחשב',
        pvpSubtitle: 'שחק נגד חבר',
        pvcSubtitle: 'אתגר את המחשב',
        easyBtn: 'קל',
        mediumBtn: 'בינוני',
        hardBtn: 'קשה',
        easyDesc: 'משחק רגוע',
        mediumDesc: 'אתגר מאוזן',
        hardDesc: 'רמת מומחה',
        gameModeTitle: 'מצב משחק',
        difficultyTitle: 'בחר רמת קושי',
        startGameBtn: 'התחל משחק',
        mobileHelp: 'הקש כדי לזוז • הקש פעמיים להחלפת מצבים',
        languageToggle: '🌐 English'
    }
};

function t(key, ...args) {
    let text = translations[currentLanguage][key] || key;
    args.forEach((arg, index) => {
        text = text.replace(`{${index}}`, arg);
    });
    return text;
}

function switchLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'he' : 'en';
    document.documentElement.lang = currentLanguage;
    document.body.classList.toggle('rtl', currentLanguage === 'he');
    updateAllText();
}

function updateAllText() {
    // Update starting screen
    const gameTitle = document.querySelector('.game-logo h1');
    if (gameTitle) gameTitle.textContent = t('gameTitle');
    
    const gameDesc = document.getElementById('game-description');
    if (gameDesc) gameDesc.textContent = t('gameDescription');
    
    // Update language toggle button (menu)
    const langToggle = document.getElementById('language-toggle');
    if (langToggle) {
        const langText = langToggle.querySelector('.btn-text') || langToggle.querySelector('span:last-child');
        if (langText) {
            langText.textContent = t('languageToggle').replace('🌐 ', '');
        } else {
            langToggle.innerHTML = `<span>🌐</span> <span class="btn-text">${t('languageToggle').replace('🌐 ', '')}</span>`;
        }
    }
    
    // Update starting screen language toggle
    const startLangToggle = document.getElementById('start-language-toggle');
    if (startLangToggle) {
        const startLangText = startLangToggle.querySelector('.btn-text');
        if (startLangText) {
            startLangText.textContent = t('languageToggle').replace('🌐 ', '');
        }
    }
    
    // Update game mode selection texts
    const difficultyTitle = document.getElementById('difficulty-title');
    if (difficultyTitle) difficultyTitle.textContent = t('difficultyTitle');
    
    const pvpText = document.getElementById('pvp-btn-text');
    if (pvpText) pvpText.textContent = t('pvpBtn');
    
    const pvcText = document.getElementById('pvc-btn-text');
    if (pvcText) pvcText.textContent = t('pvcBtn');
    
    // Update starting screen subtitles
    const pvpSubtitle = document.getElementById('pvp-subtitle');
    if (pvpSubtitle) pvpSubtitle.textContent = t('pvpSubtitle');
    
    const pvcSubtitle = document.getElementById('pvc-subtitle');
    if (pvcSubtitle) pvcSubtitle.textContent = t('pvcSubtitle');
    
    const easyText = document.getElementById('easy-btn-text');
    if (easyText) easyText.textContent = t('easyBtn');
    
    const mediumText = document.getElementById('medium-btn-text');
    if (mediumText) mediumText.textContent = t('mediumBtn');
    
    const hardText = document.getElementById('hard-btn-text');
    if (hardText) hardText.textContent = t('hardBtn');
    
    // Update difficulty descriptions
    const easyDesc = document.getElementById('easy-desc');
    if (easyDesc) easyDesc.textContent = t('easyDesc');
    
    const mediumDesc = document.getElementById('medium-desc');
    if (mediumDesc) mediumDesc.textContent = t('mediumDesc');
    
    const hardDesc = document.getElementById('hard-desc');
    if (hardDesc) hardDesc.textContent = t('hardDesc');
    
    // Update main action button labels
    const moveBtnLabel = document.querySelector('#move-btn .btn-label');
    if (moveBtnLabel) moveBtnLabel.textContent = t('moveBtn');
    
    const wallBtnLabel = document.querySelector('#wall-btn .btn-label');
    if (wallBtnLabel) wallBtnLabel.textContent = t('wallBtn');
    
    // Update main language toggle button
    const mainLangToggle = document.querySelector('#main-language-toggle .btn-label');
    if (mainLangToggle) {
        mainLangToggle.textContent = t('languageToggle').replace('🌐 ', '');
    }
    
    // Update menu button texts
    const resetBtnText = document.querySelector('#reset-btn .btn-text');
    if (resetBtnText) resetBtnText.textContent = t('newGameBtn');
    
    // Update menu section headers
    const menuSections = document.querySelectorAll('.menu-section h3');
    if (menuSections.length >= 3) {
        menuSections[0].textContent = currentLanguage === 'he' ? 'מצב המשחק' : 'Game Status';
        menuSections[1].textContent = currentLanguage === 'he' ? 'פקדי משחק' : 'Game Controls';
        menuSections[2].textContent = currentLanguage === 'he' ? 'הגדרות' : 'Settings';
        if (menuSections[3]) {
            menuSections[3].textContent = currentLanguage === 'he' ? 'איך לשחק' : 'How to Play';
        }
    }
    
    // Update game info section
    const gameInfoPs = document.querySelectorAll('.game-info p');
    if (gameInfoPs.length > 0 && currentLanguage === 'he') {
        gameInfoPs[0].innerHTML = '🎯 <strong>מטרה:</strong> הגע לצד הנגדי של הלוח';
        gameInfoPs[1].innerHTML = '🚶 <strong>תנועה:</strong> לחץ על המרבעים המסומנים כדי להזיז את הכלי';
        gameInfoPs[2].innerHTML = '🧱 <strong>חומות:</strong> הצב חומות כדי לחסום את נתיב היריב';
        gameInfoPs[3].innerHTML = '⚡ <strong>טיפ:</strong> אתה יכול לקפוץ מעל היריב!';
    } else if (gameInfoPs.length > 0) {
        gameInfoPs[0].innerHTML = '🎯 <strong>Goal:</strong> Reach the opposite side of the board';
        gameInfoPs[1].innerHTML = '🚶 <strong>Move:</strong> Click on highlighted squares to move your piece';
        gameInfoPs[2].innerHTML = '🧱 <strong>Walls:</strong> Place walls to block your opponent\'s path';
        gameInfoPs[3].innerHTML = '⚡ <strong>Tip:</strong> You can jump over your opponent!';
    }
    
    // Update mobile help text
    const mobileHelp = document.getElementById('mobile-help');
    if (mobileHelp) {
        mobileHelp.textContent = t('mobileHelp');
    }
    
    if (typeof updateUI === 'function') {
        updateUI(); // Refresh all dynamic text
    }
}