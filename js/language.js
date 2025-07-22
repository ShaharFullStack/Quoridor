// --- LANGUAGE SYSTEM ---
let currentLanguage = 'en';

const translations = {
    en: {
        gameTitle: 'Quoridor',
        gameDescription: 'Reach the other side of the board before your opponent!',
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
        winner: '🎉 Player {0} wins! 🎉',
        aiWinner: '🎉 AI wins! 🎉',
        playerWinner: '🎉 You win! 🎉',
        moveBtn: 'Move',
        wallBtn: 'Place Wall',
        wallStepBtn: 'Step {0}/2',
        cancelWallBtn: 'Cancel Wall',
        newGameBtn: 'New Game',
        pvpBtn: 'Player vs Player',
        pvcBtn: 'Player vs AI',
        easyBtn: 'Easy',
        mediumBtn: 'Medium',
        hardBtn: 'Hard',
        gameModeTitle: 'Game Mode',
        difficultyTitle: 'AI Difficulty',
        startGameBtn: 'Start Game',
        mobileHelp: 'Tap to move • Double-tap to switch modes',
        languageToggle: '🌐 עברית'
    },
    he: {
        gameTitle: 'המסדרון',
        gameDescription: 'הגע לקצה השני של הלוח לפני היריב!',
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
        winner: '🎉 שחקן {0} ניצח! 🎉',
        aiWinner: '🎉 המחשב ניצח! 🎉',
        playerWinner: '🎉 ניצחת! 🎉',
        moveBtn: 'תנועה',
        wallBtn: 'הצב חומה',
        wallStepBtn: 'שלב {0}/2',
        cancelWallBtn: 'בטל חומה',
        newGameBtn: 'חדש',
        pvpBtn: 'שחקן נגד שחקן',
        pvcBtn: 'שחקן נגד מחשב',
        easyBtn: 'קל',
        mediumBtn: 'בינוני',
        hardBtn: 'קשה',
        gameModeTitle: 'מצב משחק',
        difficultyTitle: 'רמת קושי',
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
    // Update main headers
    document.querySelectorAll('#header h1').forEach(h1 => h1.textContent = t('gameTitle'));
    document.querySelectorAll('#game-description').forEach(p => p.textContent = t('gameDescription'));
    document.getElementById('language-toggle').textContent = t('languageToggle');
    
    // Update game mode selection texts
    document.getElementById('game-mode-title').textContent = t('gameModeTitle');
    document.getElementById('difficulty-title').textContent = t('difficultyTitle');
    document.getElementById('pvp-btn-text').textContent = t('pvpBtn');
    document.getElementById('pvc-btn-text').textContent = t('pvcBtn');
    document.getElementById('easy-btn-text').textContent = t('easyBtn');
    document.getElementById('medium-btn-text').textContent = t('mediumBtn');
    document.getElementById('hard-btn-text').textContent = t('hardBtn');
    
    // Update main game button texts
    document.querySelector('#move-btn .btn-text').textContent = t('moveBtn');
    document.querySelector('#reset-btn .btn-text').textContent = t('newGameBtn');
    
    // Update mobile help text
    const mobileHelp = document.getElementById('mobile-help');
    if (mobileHelp) {
        mobileHelp.textContent = t('mobileHelp');
    }
    
    if (typeof updateUI === 'function') {
        updateUI(); // Refresh all dynamic text
    }
}