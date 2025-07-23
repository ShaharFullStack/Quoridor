// --- SCENE & UI UPDATING ---
function updateScene() {
    if(window.pawns[1]) {
        const pos1 = posToCoords(gameState.player1Position);
        const playerHeight = CUBE_HEIGHT + 1.5;
        window.pawns[1].position.set(pos1.x, playerHeight, pos1.z);
        // Update player 1 spotlight position
        if(window.playerSpotlights[1]) {
            window.playerSpotlights[1].position.set(pos1.x + 2, 15, pos1.z + 4);
            window.playerSpotlights[1].target.position.set(pos1.x, playerHeight, pos1.z);
        }
    }
    if(window.pawns[2]) {
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
    if (window.gameState.winner) {
        // Handle different winner messages based on game mode
        if (window.gameMode === 'pvc') {
            if (window.gameState.winner === 1) {
                winnerMsg.textContent = t('playerWinner');
            } else {
                winnerMsg.textContent = t('aiWinner');
            }
        } else {
            winnerMsg.textContent = t('winner', window.gameState.winner);
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
            promptText = ''; // Don't show prompts during AI turn
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
    }
    // Hide main controls during selection
    const mainControls = document.getElementById('main-controls');
    if (mainControls) {
        mainControls.style.display = 'none';
    }
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
}

// Create animated star background
function createStarField() {
    const starsContainer = document.getElementById('stars-container');
    const numberOfStars = 100;
    
    for (let i = 0; i < numberOfStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 2 + 's';
        star.style.animationDuration = (Math.random() * 3 + 1) + 's';
        starsContainer.appendChild(star);
    }
    
    // Add floating particles
    const numberOfParticles = 20;
    for (let i = 0; i < numberOfParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
        starsContainer.appendChild(particle);
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
    if (mobileHelp && MobileControls.isMobileDevice()) {
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

// Show mobile help when game starts
function startNewGame() {
    hideGameModeSelection();
    document.getElementById('difficulty-selection').style.display = 'none';
    resetGame();
    
    // Show mobile help for first-time users
    if (MobileControls.isMobileDevice()) {
        setTimeout(showMobileHelp, 1000);
    }
}

// Setup event listeners for game mode selection
function setupGameModeEventListeners() {
    // Wait for DOM to be ready
    const checkAndSetup = () => {
        console.log('Setting up game mode event listeners...');
        
        // Use more specific selectors and add both click and touch events
        const pvpBtn = document.querySelector('button[onclick*="pvp"]');
        const pvcBtn = document.querySelector('button[onclick*="pvc"]');
        
        if (pvpBtn && pvcBtn) {
            console.log('Found PVP and PVC buttons, setting up listeners');
            
            // Keep onclick as fallback, but also add event listeners
            pvpBtn.addEventListener('click', (e) => {
                console.log('PVP button clicked');
                selectGameMode('pvp');
            });
            
            pvcBtn.addEventListener('click', (e) => {
                console.log('PVC button clicked');
                selectGameMode('pvc');
            });
            
            // Also add touch events for mobile
            pvpBtn.addEventListener('touchend', (e) => {
                console.log('PVP button touched');
                e.preventDefault();
                selectGameMode('pvp');
            });
            
            pvcBtn.addEventListener('touchend', (e) => {
                console.log('PVC button touched');
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
                console.log('Found difficulty buttons, setting up listeners');
                
                easyBtn.addEventListener('click', (e) => {
                    console.log('Easy button clicked');
                    selectDifficulty('easy');
                });
                
                mediumBtn.addEventListener('click', (e) => {
                    console.log('Medium button clicked');
                    selectDifficulty('medium');
                });
                
                hardBtn.addEventListener('click', (e) => {
                    console.log('Hard button clicked');
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

// Export functions for global access
window.updateUI = updateUI;
window.updateScene = updateScene;
window.setGameMode = setGameMode;
window.createStarField = createStarField;
window.showGameModeSelection = showGameModeSelection;
window.selectGameMode = selectGameMode;
window.selectDifficulty = selectDifficulty;
window.checkAiTurn = checkAiTurn;
window.showMobileHelp = showMobileHelp;
window.hideMobileHelp = hideMobileHelp;
window.toggleMenu = toggleMenu;