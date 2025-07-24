// --- SCENE & UI UPDATING ---

// Animation system for smooth player movement
window.playerAnimations = {
    player1: { isAnimating: false, startPos: null, endPos: null, progress: 0, duration: 0.8 },
    player2: { isAnimating: false, startPos: null, endPos: null, progress: 0, duration: 0.8 }
};

function animatePlayerMovement(playerNum, fromPos, toPos, callback) {
    const animKey = `player${playerNum}`;
    const anim = window.playerAnimations[animKey];
    
    // Set up animation
    anim.isAnimating = true;
    anim.startPos = posToCoords(fromPos);
    anim.endPos = posToCoords(toPos);
    anim.progress = 0;
    
    const animationLoop = () => {
        anim.progress += 0.08; // Animation speed
        
        if (anim.progress >= 1) {
            anim.progress = 1;
            anim.isAnimating = false;
            if (callback) callback();
        }
        
        // Smooth easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - anim.progress, 3);
        
        // Interpolate position
        const currentX = anim.startPos.x + (anim.endPos.x - anim.startPos.x) * easeProgress;
        const currentZ = anim.startPos.z + (anim.endPos.z - anim.startPos.z) * easeProgress;
        
        // Add slight arc to the movement (jump effect)
        const arcHeight = Math.sin(anim.progress * Math.PI) * 0.8;
        const playerHeight = CUBE_HEIGHT + 1.5 + arcHeight;
        
        // Update pawn position
        if (window.pawns[playerNum]) {
            window.pawns[playerNum].position.set(currentX, playerHeight, currentZ);
            
            // Update spotlight to follow
            if (window.playerSpotlights[playerNum]) {
                const offsetX = playerNum === 1 ? 2 : -2;
                const offsetZ = playerNum === 1 ? 4 : -4;
                window.playerSpotlights[playerNum].position.set(currentX + offsetX, 15, currentZ + offsetZ);
                window.playerSpotlights[playerNum].target.position.set(currentX, playerHeight, currentZ);
            }
        }
        
        if (anim.isAnimating) {
            requestAnimationFrame(animationLoop);
        }
    };
    
    animationLoop();
}

// Make the animation function globally available
window.animatePlayerMovement = animatePlayerMovement;

function updateScene() {
    // Only update positions if not animating
    if(window.pawns[1] && !window.playerAnimations.player1.isAnimating) {
        const pos1 = posToCoords(gameState.player1Position);
        const playerHeight = CUBE_HEIGHT + 1.5;
        window.pawns[1].position.set(pos1.x, playerHeight, pos1.z);
        // Update player 1 spotlight position
        if(window.playerSpotlights[1]) {
            window.playerSpotlights[1].position.set(pos1.x + 2, 15, pos1.z + 4);
            window.playerSpotlights[1].target.position.set(pos1.x, playerHeight, pos1.z);
        }
    }
    if(window.pawns[2] && !window.playerAnimations.player2.isAnimating) {
        const pos2 = posToCoords(gameState.player2Position);
        const playerHeight = CUBE_HEIGHT + 1.5;
        window.pawns[2].position.set(pos2.x, playerHeight, pos2.z);
        // Update player 2 spotlight position
        if(window.playerSpotlights[2]) {
            window.playerSpotlights[2].position.set(pos2.x - 2, 15, pos2.z - 4);
            window.playerSpotlights[2].target.position.set(pos2.x, playerHeight, pos2.z);
        }
    }

    window.cellMeshes.forEach(c => {
         if(c.userData.row === 0 || c.userData.row === 8) c.material = window.materials.goal;
         else c.material = window.materials.board;
    });
    window.hWallPlanes.forEach(p => {
        p.visible = false;
        p.material = window.materials.wallPlaceholder; // Reset to default material
    });
    window.vWallPlanes.forEach(p => {
        p.visible = false;
        p.material = window.materials.wallPlaceholder; // Reset to default material
    });

    if (gameState.winner) return;

    if (gameState.gameMode === 'move') {
        window.gameState.validMoves.forEach(move => {
            const index = move.row * window.BOARD_SIZE + move.col;
            if(window.cellMeshes[index]) window.cellMeshes[index].material = window.materials.highlightMove;
        });
    } else if (gameState.gameMode === 'wall') {
        if (gameState.wallPlacementStage === 1) {
             for (let r = 0; r < window.BOARD_SIZE - 1; r++) {
                for (let c = 0; c < window.BOARD_SIZE - 1; c++) {
                    if (!window.gameState.horizontalWalls.has(`${r}-${c}`) && !window.gameState.horizontalWalls.has(`${r}-${c+1}`)) {
                        const plane = window.hWallPlanes.find(p => p.userData.row === r && p.userData.col === c);
                        if (plane) {
                            plane.visible = true;
                            plane.material = window.materials.wallPlaceholder;
                        }
                    }
                    if (!window.gameState.verticalWalls.has(`${r}-${c}`) && !window.gameState.verticalWalls.has(`${r+1}-${c}`)) {
                        const plane = window.vWallPlanes.find(p => p.userData.row === r && p.userData.col === c);
                        if (plane) {
                            plane.visible = true;
                            plane.material = window.materials.wallPlaceholder;
                        }
                    }
                }
            }
        }
        else if (window.gameState.firstWallSegment) {
            const first = window.gameState.firstWallSegment;
            
            // Show the first wall segment with prominent orange highlighting
            const firstPlane = (first.wallType === 'horizontal' ? window.hWallPlanes : window.vWallPlanes)
                .find(p => p.userData.row === first.row && p.userData.col === first.col);
            if(firstPlane) {
                firstPlane.visible = true;
                firstPlane.material = window.materials.highlightFirstWall;
            }

            // Show possible second segments with green highlighting
            const possibleSeconds = getPossibleSecondSegments(first);
            possibleSeconds.forEach(seg => {
                if (isValidWallPlacement(first, seg)) {
                    const plane = (seg.wallType === 'horizontal' ? window.hWallPlanes : window.vWallPlanes)
                        .find(p => p.userData.row === seg.row && p.userData.col === seg.col);
                    if (plane) {
                        plane.visible = true;
                        plane.material = window.materials.highlightSecondWall;
                    }
                }
            });
        }
    }
}

function updateUI() {
    // Check if gameState is properly initialized
    if (!window.gameState || !window.gameState.wallsRemaining) {
        return;
    }
    
    document.getElementById('p1-status').textContent = t('player1Walls', window.gameState.wallsRemaining[1]);
    
    // Update Player 2 status based on game mode
    if (window.gameMode === 'pvc') {
        document.getElementById('p2-status').textContent = t('playerVsAI', window.gameState.wallsRemaining[2]);
    } else {
        document.getElementById('p2-status').textContent = t('player2Walls', window.gameState.wallsRemaining[2]);
    }

    const p1Status = document.getElementById('p1-status');
    const p2Status = document.getElementById('p2-status');
    p1Status.style.textDecoration = window.gameState.currentPlayer === 1 ? 'underline' : 'none';
    p2Status.style.textDecoration = window.gameState.currentPlayer === 2 ? 'underline' : 'none';

    const winnerMsg = document.getElementById('winner-message');
    const winnerText = winnerMsg ? winnerMsg.querySelector('.winner-text') : null;
    if (window.gameState.winner) {
        // Handle different winner messages based on game mode
        if (winnerText) {
            if (window.gameMode === 'pvc') {
                if (window.gameState.winner === 1) {
                    winnerText.textContent = t('playerWinner');
                } else {
                    winnerText.textContent = t('aiWinner');
                }
            } else {
                winnerText.textContent = t('winner', window.gameState.winner);
            }
        }
        winnerMsg.classList.add('show');
        document.getElementById('turn-indicator').style.display = 'none';
        document.getElementById('action-prompt').style.display = 'none';
    } else {
        winnerMsg.classList.remove('show');
        document.getElementById('turn-indicator').style.display = 'block';
        document.getElementById('action-prompt').style.display = 'block';
        // Update turn indicator based on game mode
        if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2) {
            if (window.isAiThinking) {
                document.getElementById('turn-indicator').textContent = t('aiThinking');
            } else {
                document.getElementById('turn-indicator').textContent = t('aiTurn');
            }
        } else {
            document.getElementById('turn-indicator').textContent = t('playerTurn', window.gameState.currentPlayer);
        }
        let promptText = '';
        if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2 && !window.isAiThinking) {
            promptText = '';
        } else if (window.gameState.gameMode === 'move') {
            promptText = t('chooseMove');
        } else {
            if (window.gameState.wallPlacementStage === 1) {
                promptText = t('wallStep1');
            } else {
                promptText = t('wallStep2');
            }
        }
        document.getElementById('action-prompt').textContent = promptText;
    }
// Winner overlay button handlers with mobile support
function setupWinnerOverlayButtons() {
    const menuBtn = document.getElementById('winner-menu-btn');
    const replayBtn = document.getElementById('winner-replay-btn');
    
    if (menuBtn) {
        // Remove any existing onclick to prevent conflicts
        menuBtn.removeAttribute('onclick');
        
        const handleMenuClick = (e) => {
            e.preventDefault();
            // Hide winner overlay and show main menu
            document.getElementById('winner-message').classList.remove('show');
            showGameModeSelection();
        };
        
        menuBtn.addEventListener('click', handleMenuClick);
        menuBtn.addEventListener('touchend', handleMenuClick);
    }
    
    if (replayBtn) {
        // Remove any existing onclick to prevent conflicts
        replayBtn.removeAttribute('onclick');
        
        const handleReplayClick = (e) => {
            e.preventDefault();
            document.getElementById('winner-message').classList.remove('show');
            startNewGame();
        };
        
        replayBtn.addEventListener('click', handleReplayClick);
        replayBtn.addEventListener('touchend', handleReplayClick);
    }
}

// Setup winner overlay buttons on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWinnerOverlayButtons);
} else {
    setupWinnerOverlayButtons();
}

    // Disable controls during AI turn
    const isAiTurn = window.gameMode === 'pvc' && window.gameState.currentPlayer === 2;
    
    // Update both menu buttons and main action buttons
    const moveBtn = document.getElementById('move-btn');
    const wallBtn = document.getElementById('wall-btn');
    
    if (moveBtn) {
        moveBtn.classList.toggle('active', window.gameState.gameMode === 'move');
        moveBtn.disabled = isAiTurn || window.gameState.winner;
    }
    
    if (wallBtn) {
        wallBtn.classList.toggle('active', window.gameState.gameMode === 'wall');
        wallBtn.disabled = isAiTurn || window.gameState.wallsRemaining[window.gameState.currentPlayer] <= 0 || window.gameState.winner;
        
        // Update wall button text if it has btn-text class (menu button)
        const btnText = wallBtn.querySelector('.btn-text');
        const btnLabel = wallBtn.querySelector('.btn-label');
        
        if (window.gameState.gameMode === 'wall') {
            if (window.gameState.wallPlacementStage === 2) {
                if (btnText) wallBtn.innerHTML = `<span>❌</span><span class="btn-text">${t('cancelWallBtn')}</span>`;
                if (btnLabel) {
                    wallBtn.querySelector('span:first-child').textContent = '❌';
                    btnLabel.textContent = 'Cancel';
                }
            } else {
                if (btnText) wallBtn.innerHTML = `<span>🧱</span><span class="btn-text">${t('wallStepBtn', window.gameState.wallPlacementStage)}</span>`;
                if (btnLabel) {
                    wallBtn.querySelector('span:first-child').textContent = '🧱';
                    btnLabel.textContent = 'Wall';
                }
            }
        } else {
            if (btnText) wallBtn.innerHTML = `<span>🧱</span><span class="btn-text">${t('wallBtn')}</span>`;
            if (btnLabel) {
                wallBtn.querySelector('span:first-child').textContent = '🧱';
                btnLabel.textContent = 'Wall';
            }
        }
    }
}

function setGameMode(mode) {
    if (window.gameState.winner) return;
    if (mode === 'wall' && window.gameState.gameMode === 'wall' && window.gameState.wallPlacementStage === 2) {
        window.gameState.wallPlacementStage = 1;
        window.gameState.firstWallSegment = null;
        setGameMode('move'); 
        return;
    }

    window.gameState.gameMode = mode;
    window.gameState.wallPlacementStage = 1;
    window.gameState.firstWallSegment = null;
    updateScene();
    updateUI();
}

// Game mode selection functions
function showGameModeSelection() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.classList.remove('hidden');
        // Remove any direct style overrides to let CSS take control
        startScreen.style.display = '';
    }
    
    // Hide main controls during selection
    const mainControls = document.getElementById('main-controls');
    if (mainControls) {
        mainControls.style.display = 'none';
    }
    
    // Hide game menu if open
    const gameMenu = document.getElementById('game-menu');
    if (gameMenu) {
        gameMenu.classList.add('collapsed');
        const menuIcon = document.querySelector('.menu-icon');
        if (menuIcon) menuIcon.textContent = '☰';
    }
    
    // Reset difficulty selection and game mode buttons
    const difficultySelection = document.getElementById('difficulty-selection');
    if (difficultySelection) {
        difficultySelection.style.display = 'none';
    }
    
    const gameModeButtons = document.querySelector('.start-game-modes');
    if (gameModeButtons) {
        gameModeButtons.style.display = 'block';
    }
    
    // Clear any previous game mode
    window.gameMode = null;
    window.aiPlayer = null;
}

function hideGameModeSelection() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.classList.add('hidden');
    }
    // Show main controls after selection
    const mainControls = document.getElementById('main-controls');
    if (mainControls) {
        mainControls.style.display = 'flex';
    }
}

function selectGameMode(mode) {
    window.gameMode = mode;
    if (mode === 'pvc') {
        // Show difficulty selection in start screen
        const difficultySelection = document.getElementById('difficulty-selection');
        if (difficultySelection) {
            difficultySelection.style.display = 'block';
        }
        
        // Hide game mode buttons
        const gameModeButtons = document.querySelector('.start-game-modes');
        if (gameModeButtons) {
            gameModeButtons.style.display = 'none';
        }
    } else {
        // Start PvP game immediately
        startNewGame();
    }
}

function selectDifficulty(difficulty) {
    window.aiDifficulty = difficulty;
    window.aiPlayer = new QuoridorAI(difficulty);
    startNewGame();
}

function startNewGame() {
    hideGameModeSelection();
    document.getElementById('difficulty-selection').style.display = 'none';
    resetGame();
    
    // Show mobile help for first-time users
    if (typeof MobileControls !== 'undefined' && MobileControls.isMobileDevice()) {
        setTimeout(showMobileHelp, 1000);
    }
}

// Add event listener for AI moves
function checkAiTurn() {
    if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2 && !window.gameState.winner && !window.isAiThinking) {
        window.aiPlayer.makeMove();
    }
}

// Mobile help functionality
function showMobileHelp() {
    const mobileHelp = document.getElementById('mobile-help');
    if (mobileHelp && typeof MobileControls !== 'undefined' && MobileControls.isMobileDevice()) {
        mobileHelp.textContent = t('mobileHelp');
        mobileHelp.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            mobileHelp.classList.remove('show');
        }, 3000);
    }
}

function hideMobileHelp() {
    const mobileHelp = document.getElementById('mobile-help');
    if (mobileHelp) {
        mobileHelp.classList.remove('show');
    }
}

// Setup event listeners for game mode selection
function setupGameModeEventListeners() {
    // Wait for DOM to be ready
    const checkAndSetup = () => {
        // Use more specific selectors and add both click and touch events
        const pvpBtn = document.querySelector('button[onclick*="pvp"]');
        const pvcBtn = document.querySelector('button[onclick*="pvc"]');
        
        if (pvpBtn && pvcBtn) {
            
            // Remove onclick attributes to prevent double execution
            pvpBtn.removeAttribute('onclick');
            pvcBtn.removeAttribute('onclick');
            
            // Add single event listeners
            pvpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                selectGameMode('pvp');
            });
            
            pvcBtn.addEventListener('click', (e) => {
                e.preventDefault();
                selectGameMode('pvc');
            });
            
            // Also add touch events for mobile
            pvpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                selectGameMode('pvp');
            });
            
            pvcBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                selectGameMode('pvc');
            });
        }
        
        // Setup difficulty buttons
        const setupDifficultyButtons = () => {
            const easyBtn = document.querySelector('button[onclick*="easy"]');
            const mediumBtn = document.querySelector('button[onclick*="medium"]');
            const hardBtn = document.querySelector('button[onclick*="hard"]');
            
            if (easyBtn && mediumBtn && hardBtn) {
                // Remove onclick attributes to prevent double execution
                easyBtn.removeAttribute('onclick');
                mediumBtn.removeAttribute('onclick');
                hardBtn.removeAttribute('onclick');
                
                easyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectDifficulty('easy');
                });
                
                mediumBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectDifficulty('medium');
                });
                
                hardBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectDifficulty('hard');
                });
                
                // Touch events for mobile
                easyBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    selectDifficulty('easy');
                });
                
                mediumBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    selectDifficulty('medium');
                });
                
                hardBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    selectDifficulty('hard');
                });
            }
        };
        
        // Setup difficulty buttons initially and after difficulty panel shows
        setupDifficultyButtons();
        
        // Also setup difficulty buttons when they become visible
        const observer = new MutationObserver(() => {
            setupDifficultyButtons();
        });
        
        const difficultyPanel = document.getElementById('difficulty-selection');
        if (difficultyPanel) {
            observer.observe(difficultyPanel, { childList: true, subtree: true, attributes: true });
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndSetup);
    } else {
        setTimeout(checkAndSetup, 100); // Small delay to ensure DOM is fully ready
    }
}

// Initialize event listeners

setupGameModeEventListeners();

// --- MOBILE: Add touch support for in-game action buttons and menu toggle ---
function setupInGameMobileTouchEvents() {
    // Main action buttons
    const moveBtn = document.getElementById('move-btn');
    const wallBtn = document.getElementById('wall-btn');
    const langBtn = document.getElementById('main-language-toggle');
    const menuToggle = document.getElementById('menu-toggle');

    if (moveBtn) {
        moveBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!moveBtn.disabled) setGameMode('move');
        });
    }
    if (wallBtn) {
        wallBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!wallBtn.disabled) setGameMode('wall');
        });
    }
    if (langBtn) {
        langBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            switchLanguage();
        });
    }
    if (menuToggle) {
        menuToggle.addEventListener('touchend', (e) => {
            e.preventDefault();
            toggleMenu();
        });
    }
    
    // Menu buttons with mobile touch support
    setupMenuButtonTouchEvents();
}

// Setup mobile touch events for menu buttons
function setupMenuButtonTouchEvents() {
    const menuButtons = [
        { id: 'reset-btn', handler: showGameModeSelection },
        { id: 'restart-btn', handler: () => { 
            if (window.gameMode) startNewGame(); 
        }},
        { id: 'undo-btn', handler: undoLastMove },
        { id: 'language-toggle', handler: switchLanguage },
        { id: 'sound-toggle', handler: toggleSound },
        { id: 'theme-toggle', handler: toggleTheme },
        { id: 'fullscreen-btn', handler: toggleFullscreen }
    ];
    
    menuButtons.forEach(({ id, handler }) => {
        const btn = document.getElementById(id);
        if (btn) {
            // Remove onclick to prevent conflicts
            btn.removeAttribute('onclick');
            
            const handleClick = (e) => {
                e.preventDefault();
                handler();
            };
            
            btn.addEventListener('click', handleClick);
            btn.addEventListener('touchend', handleClick);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupInGameMobileTouchEvents);
} else {
    setTimeout(setupInGameMobileTouchEvents, 100);
}

// Menu toggle functionality
function toggleMenu() {
    const menu = document.getElementById('game-menu');
    menu.classList.toggle('collapsed');
    
    // Update menu icon
    const menuIcon = document.querySelector('.menu-icon');
    if (menu.classList.contains('collapsed')) {
        menuIcon.textContent = '☰';
    } else {
        menuIcon.textContent = '✕';
    }
}

// New menu functionality
function undoLastMove() {
    // TODO: Implement undo functionality
    // For now, just show a message
    alert('Undo feature coming soon!');
}

function toggleSound() {
    // TODO: Implement sound toggle
    const btn = document.getElementById('sound-toggle');
    if (btn) {
        const span = btn.querySelector('span');
        if (span.textContent === '🔊') {
            span.textContent = '🔇';
        } else {
            span.textContent = '🔊';
        }
    }
}

function toggleTheme() {
    // TODO: Implement theme toggle
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        const span = btn.querySelector('span');
        if (span.textContent === '🌙') {
            span.textContent = '☀️';
            document.body.classList.add('light-mode');
        } else {
            span.textContent = '🌙';
            document.body.classList.remove('light-mode');
        }
    }
}

function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                // Fullscreen request failed silently
            });
        } else {
            document.exitFullscreen().catch(err => {
                // Exit fullscreen failed silently
            });
        }
    } catch (err) {
        // Fullscreen not supported
    }
}

// Export functions for global access
window.updateUI = updateUI;
window.updateScene = updateScene;
window.setGameMode = setGameMode;
window.showGameModeSelection = showGameModeSelection;
window.selectGameMode = selectGameMode;
window.selectDifficulty = selectDifficulty;
window.checkAiTurn = checkAiTurn;
window.showMobileHelp = showMobileHelp;
window.hideMobileHelp = hideMobileHelp;
window.toggleMenu = toggleMenu;
window.undoLastMove = undoLastMove;
window.toggleSound = toggleSound;
window.toggleTheme = toggleTheme;
window.toggleFullscreen = toggleFullscreen;