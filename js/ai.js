// — ENHANCED AI PLAYER SYSTEM —

class QuoridorAI {
constructor(difficulty = ‘medium’) {
this.difficulty = difficulty;
this.player = 2; // AI is always player 2

    // New: Track move history to avoid repetitive patterns
    this.moveHistory = [];
    this.recentPositions = [];
    this.consecutiveSameAreaMoves = 0;
    this.lastFocusArea = null;
    
    // Strategic parameters
    this.aggressiveness = this.getAggressivenessLevel();
    this.preferredStrategy = this.selectStrategy();
}

// Initialize AI personality traits based on difficulty
getAggressivenessLevel() {
    switch (this.difficulty) {
        case 'easy': return 0.3;
        case 'medium': return 0.5;
        case 'hard': return 0.7;
        default: return 0.5;
    }
}

// Select initial strategy with some randomization
selectStrategy() {
    const strategies = ['aggressive', 'defensive', 'balanced', 'adaptive'];
    if (this.difficulty === 'easy') {
        return 'balanced';
    } else if (this.difficulty === 'hard') {
        // Hard mode can use any strategy, with preference for adaptive
        const weights = [0.2, 0.2, 0.2, 0.4];
        return this.weightedRandom(strategies, weights);
    }
    return strategies[Math.floor(Math.random() * 3)]; // Medium: first 3 strategies
}

// Utility function for weighted random selection
weightedRandom(options, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < options.length; i++) {
        random -= weights[i];
        if (random <= 0) return options[i];
    }
    return options[options.length - 1];
}

// Main AI decision making
async makeMove() {
    if (gameState.winner || gameState.currentPlayer !== this.player || isAiThinking) return;
    
    isAiThinking = true;
    updateUI(); // Show AI thinking state
    
    // Variable delay based on difficulty for better UX
    const thinkingTime = this.difficulty === 'easy' ? 300 : 
                       this.difficulty === 'medium' ? 500 : 700;
    await new Promise(resolve => setTimeout(resolve, thinkingTime));
    
    const move = this.calculateBestMove();
    
    // Track move history
    this.recordMove(move);
    
    if (move.type === 'move') {
        this.executePlayerMove(move.row, move.col);
    } else if (move.type === 'wall') {
        this.executeWallPlacement(move.seg1, move.seg2);
    }
    
    isAiThinking = false;
}

// Record move to prevent repetitive patterns
recordMove(move) {
    this.moveHistory.push(move);
    if (this.moveHistory.length > 10) {
        this.moveHistory.shift(); // Keep only recent history
    }
    
    if (move.type === 'move') {
        this.recentPositions.push({ row: move.row, col: move.col });
        if (this.recentPositions.length > 6) {
            this.recentPositions.shift();
        }
        
        // Check if AI is focusing on same area
        const currentArea = Math.floor(move.col / 3); // Divide board into 3 vertical zones
        if (currentArea === this.lastFocusArea) {
            this.consecutiveSameAreaMoves++;
        } else {
            this.consecutiveSameAreaMoves = 0;
            this.lastFocusArea = currentArea;
        }
    }
}

// Check if a position was recently visited
isRecentlyVisited(row, col) {
    return this.recentPositions.some(pos => 
        pos.row === row && pos.col === col
    );
}

calculateBestMove() {
    // Adapt strategy based on game state
    this.updateStrategy();
    
    switch (this.difficulty) {
        case 'easy':
            return this.calculateEasyMove();
        case 'medium':
            return this.calculateMediumMove();
        case 'hard':
            return this.calculateHardMove();
        default:
            return this.calculateMediumMove();
    }
}

// Update strategy based on game progression
updateStrategy() {
    if (this.difficulty !== 'hard' || this.preferredStrategy !== 'adaptive') return;
    
    const aiPos = gameState.player2Position;
    const playerPos = gameState.player1Position;
    const gameProgress = (aiPos.row + (8 - playerPos.row)) / 16;
    
    // Switch strategies based on game state
    if (playerPos.row <= 2 && gameState.wallsRemaining[this.player] > 0) {
        this.preferredStrategy = 'defensive';
    } else if (aiPos.row >= 6) {
        this.preferredStrategy = 'aggressive';
    } else if (gameProgress > 0.7) {
        this.preferredStrategy = 'balanced';
    }
}

// EASY AI: Improved random moves with basic pattern avoidance
calculateEasyMove() {
    const validMoves = [...gameState.validMoves];
    
    // Filter out recently visited positions to avoid loops
    const freshMoves = validMoves.filter(move => 
        !this.isRecentlyVisited(move.row, move.col)
    );
    const movesToConsider = freshMoves.length > 0 ? freshMoves : validMoves;
    
    // 15% chance to place a wall
    if (Math.random() < 0.15 && gameState.wallsRemaining[this.player] > 0) {
        const wallMove = this.findRandomWall();
        if (wallMove) return wallMove;
    }
    
    // Slightly prefer forward moves
    const forwardMoves = movesToConsider.filter(move => move.row > gameState.player2Position.row);
    if (forwardMoves.length > 0 && Math.random() < 0.7) {
        const randomMove = forwardMoves[Math.floor(Math.random() * forwardMoves.length)];
        return { type: 'move', row: randomMove.row, col: randomMove.col };
    }
    
    // Otherwise, move randomly
    if (movesToConsider.length > 0) {
        const randomMove = movesToConsider[Math.floor(Math.random() * movesToConsider.length)];
        return { type: 'move', row: randomMove.row, col: randomMove.col };
    }
    
    return this.calculateMediumMove(); // Fallback
}

// MEDIUM AI: Improved balanced strategy with pattern breaking
calculateMediumMove() {
    const validMoves = [...gameState.validMoves];
    const aiPos = gameState.player2Position;
    const playerPos = gameState.player1Position;
    
    // Check for winning move first
    for (const move of validMoves) {
        if (move.row === 8) {
            return { type: 'move', row: move.row, col: move.col };
        }
    }
    
    // Enhanced blocking logic
    if (playerPos.row <= 2 && gameState.wallsRemaining[this.player] > 0) {
        const blockWall = this.findSmartBlockingWall();
        if (blockWall) return blockWall;
    }
    
    // Break out of repetitive patterns
    if (this.consecutiveSameAreaMoves > 2) {
        const breakoutMove = this.findPatternBreakingMove(validMoves);
        if (breakoutMove) return breakoutMove;
    }
    
    // Strategic wall placement (35% chance)
    if (Math.random() < 0.35 && gameState.wallsRemaining[this.player] > 0) {
        const strategicWall = this.findEnhancedStrategicWall();
        if (strategicWall) return strategicWall;
    }
    
    // Move towards goal with improved evaluation
    const bestMove = this.findBestProgressMoveWithMemory(validMoves, aiPos);
    return { type: 'move', row: bestMove.row, col: bestMove.col };
}

// HARD AI: Advanced strategy with minimax-inspired evaluation
calculateHardMove() {
    const validMoves = [...gameState.validMoves];
    const aiPos = gameState.player2Position;
    const playerPos = gameState.player1Position;
    
    // Immediate win check
    for (const move of validMoves) {
        if (move.row === 8) {
            return { type: 'move', row: move.row, col: move.col };
        }
    }
    
    // Critical blocking
    if (playerPos.row <= 1 && gameState.wallsRemaining[this.player] > 0) {
        const blockWall = this.findOptimalBlockingWall();
        if (blockWall) return blockWall;
    }
    
    // Break repetitive patterns aggressively
    if (this.consecutiveSameAreaMoves > 1) {
        const breakoutMove = this.findPatternBreakingMove(validMoves);
        if (breakoutMove) return breakoutMove;
    }
    
    // Advanced move evaluation
    let bestScore = -Infinity;
    let bestMove = null;
    const moveScores = [];
    
    // Evaluate all movement options
    for (const move of validMoves) {
        const score = this.evaluateAdvancedPosition(move, aiPos, playerPos);
        moveScores.push({ move: { type: 'move', ...move }, score });
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = { type: 'move', row: move.row, col: move.col };
        }
    }
    
    // Evaluate wall placements
    if (gameState.wallsRemaining[this.player] > 0) {
        const wallOptions = this.getSmartWallPlacements();
        for (const wall of wallOptions) {
            const score = this.evaluateAdvancedWallPlacement(wall, aiPos, playerPos);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = wall;
            }
        }
    }
    
    // Add controlled randomness to top moves to avoid predictability
    const topMoves = moveScores
        .filter(m => m.score >= bestScore * 0.9)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    
    if (topMoves.length > 1 && Math.random() < 0.3) {
        return topMoves[Math.floor(Math.random() * topMoves.length)].move;
    }
    
    return bestMove || { type: 'move', row: validMoves[0].row, col: validMoves[0].col };
}

// Find move that breaks repetitive patterns
findPatternBreakingMove(validMoves) {
    const currentCol = gameState.player2Position.col;
    
    // Prefer moves that change column significantly
    const differentColumnMoves = validMoves.filter(move => 
        Math.abs(move.col - currentCol) >= 2 &&
        !this.isRecentlyVisited(move.row, move.col)
    );
    
    if (differentColumnMoves.length > 0) {
        // Still prefer forward movement
        const forwardDifferent = differentColumnMoves.filter(m => 
            m.row > gameState.player2Position.row
        );
        
        if (forwardDifferent.length > 0) {
            return { 
                type: 'move', 
                row: forwardDifferent[0].row, 
                col: forwardDifferent[0].col 
            };
        }
        
        return { 
            type: 'move', 
            row: differentColumnMoves[0].row, 
            col: differentColumnMoves[0].col 
        };
    }
    
    return null;
}

// Enhanced strategic wall finding
findEnhancedStrategicWall() {
    const walls = this.getSmartWallPlacements();
    const aiPos = gameState.player2Position;
    const playerPos = gameState.player1Position;
    
    let bestWall = null;
    let bestScore = -100;
    
    for (const wall of walls) {
        let score = 0;
        
        // Calculate path impact
        const tempWalls = this.simulateWallPlacement(wall);
        const aiNewDist = this.calculateShortestPath(aiPos, 8, tempWalls);
        const playerNewDist = this.calculateShortestPath(playerPos, 0, tempWalls);
        const aiCurrDist = this.calculateShortestPath(aiPos, 8, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const playerCurrDist = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        
        // Skip if it blocks either player
        if (aiNewDist === -1 || playerNewDist === -1) continue;
        
        // Favor walls that increase opponent's path more than ours
        const aiIncrease = aiNewDist - aiCurrDist;
        const playerIncrease = playerNewDist - playerCurrDist;
        score += (playerIncrease - aiIncrease) * 20;
        
        // Strategic positioning
        const wallRow = Math.min(wall.seg1.row, wall.seg2.row);
        const wallCol = Math.min(wall.seg1.col, wall.seg2.col);
        
        // Prefer walls in opponent's path
        if (Math.abs(wallRow - playerPos.row) <= 2) score += 15;
        
        // Avoid walls that trap us
        if (aiIncrease > 2) score -= 30;
        
        // Add some randomness to avoid predictability
        score += Math.random() * 10;
        
        if (score > bestScore) {
            bestScore = score;
            bestWall = wall;
        }
    }
    
    return bestScore > 10 ? bestWall : null;
}

// Get smart wall placements (not all possible walls)
getSmartWallPlacements() {
    const walls = [];
    const playerPos = gameState.player1Position;
    const aiPos = gameState.player2Position;
    
    // Focus on strategic areas instead of checking entire board
    const rowStart = Math.max(0, Math.min(playerPos.row - 2, aiPos.row - 2));
    const rowEnd = Math.min(BOARD_SIZE - 2, Math.max(playerPos.row + 2, aiPos.row + 2));
    
    for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = 0; c < BOARD_SIZE - 1; c++) {
            // Skip walls far from action
            if (Math.abs(c - playerPos.col) > 3 && Math.abs(c - aiPos.col) > 3) continue;
            
            // Check horizontal walls
            if (c < BOARD_SIZE - 2) {
                const hWall1 = { wallType: 'horizontal', row: r, col: c };
                const hWall2 = { wallType: 'horizontal', row: r, col: c + 1 };
                if (isValidWallPlacement(hWall1, hWall2)) {
                    walls.push({ type: 'wall', seg1: hWall1, seg2: hWall2 });
                }
            }
            
            // Check vertical walls
            if (r < BOARD_SIZE - 3) {
                const vWall1 = { wallType: 'vertical', row: r, col: c };
                const vWall2 = { wallType: 'vertical', row: r + 1, col: c };
                if (isValidWallPlacement(vWall1, vWall2)) {
                    walls.push({ type: 'wall', seg1: vWall1, seg2: vWall2 });
                }
            }
        }
    }
    
    return walls;
}

// Find best blocking wall with smarter logic
findSmartBlockingWall() {
    const playerPos = gameState.player1Position;
    const walls = this.getSmartWallPlacements();
    
    let bestWall = null;
    let maxPathIncrease = 0;
    
    for (const wall of walls) {
        const tempWalls = this.simulateWallPlacement(wall);
        const currentDist = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const newDist = this.calculateShortestPath(playerPos, 0, tempWalls);
        
        if (newDist > currentDist && newDist !== -1) {
            const increase = newDist - currentDist;
            if (increase > maxPathIncrease) {
                maxPathIncrease = increase;
                bestWall = wall;
            }
        }
    }
    
    return maxPathIncrease > 1 ? bestWall : null;
}

// Find optimal blocking wall for hard mode
findOptimalBlockingWall() {
    const playerPos = gameState.player1Position;
    const walls = this.getSmartWallPlacements();
    
    let bestWall = null;
    let bestScore = -Infinity;
    
    for (const wall of walls) {
        const score = this.evaluateBlockingWall(wall, playerPos);
        if (score > bestScore) {
            bestScore = score;
            bestWall = wall;
        }
    }
    
    return bestScore > 20 ? bestWall : null;
}

// Evaluate blocking wall effectiveness
evaluateBlockingWall(wall, playerPos) {
    const tempWalls = this.simulateWallPlacement(wall);
    const aiPos = gameState.player2Position;
    
    const playerCurrDist = this.calculateShortestPath(playerPos, 0, {
        horizontal: gameState.horizontalWalls,
        vertical: gameState.verticalWalls
    });
    const playerNewDist = this.calculateShortestPath(playerPos, 0, tempWalls);
    const aiCurrDist = this.calculateShortestPath(aiPos, 8, {
        horizontal: gameState.horizontalWalls,
        vertical: gameState.verticalWalls
    });
    const aiNewDist = this.calculateShortestPath(aiPos, 8, tempWalls);
    
    if (playerNewDist === -1 || aiNewDist === -1) return -Infinity;
    
    let score = 0;
    score += (playerNewDist - playerCurrDist) * 30; // Heavily weight player slowdown
    score -= (aiNewDist - aiCurrDist) * 20; // Penalize our own slowdown
    
    // Bonus for walls very close to player
    const wallRow = Math.min(wall.seg1.row, wall.seg2.row);
    if (Math.abs(wallRow - playerPos.row) <= 1) score += 20;
    
    return score;
}

// Find best move with pattern avoidance
findBestProgressMoveWithMemory(validMoves, currentPos) {
    let bestMove = validMoves[0];
    let bestScore = -1000;
    
    for (const move of validMoves) {
        let score = 0;
        
        // Base progress score
        score += (move.row - currentPos.row) * 15;
        
        // Column preference with variation
        const centerDist = Math.abs(move.col - 4);
        score += (4 - centerDist) * 3;
        
        // Heavily penalize recently visited positions
        if (this.isRecentlyVisited(move.row, move.col)) {
            score -= 50;
        }
        
        // Penalize staying in same area too long
        if (this.consecutiveSameAreaMoves > 2) {
            const moveArea = Math.floor(move.col / 3);
            if (moveArea === this.lastFocusArea) {
                score -= 30;
            }
        }
        
        // Add strategy-based modifiers
        if (this.preferredStrategy === 'aggressive') {
            score += move.row * 5; // Extra bonus for forward movement
        } else if (this.preferredStrategy === 'defensive') {
            // Prefer moves that maintain distance from player
            const playerPos = gameState.player1Position;
            const dist = Math.abs(move.row - playerPos.row) + Math.abs(move.col - playerPos.col);
            score += dist * 2;
        }
        
        // Small random factor
        score += Math.random() * 5;
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

// Advanced position evaluation for hard mode
evaluateAdvancedPosition(move, aiPos, playerPos) {
    let score = 0;
    
    // Calculate paths from this position
    const tempAiPos = { row: move.row, col: move.col };
    const aiPathLength = this.calculateShortestPath(tempAiPos, 8, {
        horizontal: gameState.horizontalWalls,
        vertical: gameState.verticalWalls
    });
    
    if (aiPathLength === -1) return -Infinity;
    
    // Base score on distance to goal
    score += (50 - aiPathLength * 10);
    
    // Progress score
    score += (move.row - aiPos.row) * 20;
    
    // Position quality
    const centerBonus = 5 - Math.abs(move.col - 4);
    score += centerBonus * 3;
    
    // Avoid repetitive positions strongly
    if (this.isRecentlyVisited(move.row, move.col)) {
        score -= 100;
    }
    
    // Pattern breaking bonus
    if (this.consecutiveSameAreaMoves > 1) {
        const currentArea = Math.floor(aiPos.col / 3);
        const moveArea = Math.floor(move.col / 3);
        if (moveArea !== currentArea) {
            score += 40; // Reward changing areas
        }
    }
    
    // Strategic considerations
    const playerDist = Math.abs(move.row - playerPos.row) + Math.abs(move.col - playerPos.col);
    
    switch (this.preferredStrategy) {
        case 'aggressive':
            score += move.row * 10;
            if (move.row > playerPos.row) score += 20; // Bonus for being ahead
            break;
        case 'defensive':
            score += playerDist * 3;
            if (gameState.wallsRemaining[this.player] > 3) score += 10;
            break;
        case 'adaptive':
            // Balance based on game state
            if (playerPos.row <= 2) {
                score += playerDist * 4; // Play defensive when opponent is close
            } else {
                score += move.row * 8; // Otherwise push forward
            }
            break;
    }
    
    // Endgame considerations
    if (aiPos.row >= 6) {
        score += (move.row - aiPos.row) * 30; // Heavily prioritize winning moves
    }
    
    return score;
}

// Advanced wall evaluation for hard mode
evaluateAdvancedWallPlacement(wall, aiPos, playerPos) {
    const tempWalls = this.simulateWallPlacement(wall);
    
    // Calculate current distances
    const aiCurrDist = this.calculateShortestPath(aiPos, 8, {
        horizontal: gameState.horizontalWalls,
        vertical: gameState.verticalWalls
    });
    const playerCurrDist = this.calculateShortestPath(playerPos, 0, {
        horizontal: gameState.horizontalWalls,
        vertical: gameState.verticalWalls
    });
    
    // Calculate new distances
    const aiNewDist = this.calculateShortestPath(aiPos, 8, tempWalls);
    const playerNewDist = this.calculateShortestPath(playerPos, 0, tempWalls);
    
    if (aiNewDist === -1 || playerNewDist === -1) return -Infinity;
    
    let score = 0;
    
    // Path difference is key metric
    const aiIncrease = aiNewDist - aiCurrDist;
    const playerIncrease = playerNewDist - playerCurrDist;
    score += (playerIncrease - aiIncrease) * 25;
    
    // Strategic placement bonuses
    const wallRow = Math.min(wall.seg1.row, wall.seg2.row);
    const wallCol = Math.min(wall.seg1.col, wall.seg2.col);
    
    // Walls near opponent are more valuable
    const playerProximity = Math.abs(wallRow - playerPos.row) + Math.abs(wallCol - playerPos.col);
    score += (10 - playerProximity) * 2;
    
    // Avoid walls that trap us
    if (aiIncrease > 3) score -= 50;
    if (aiIncrease > 5) score -= 100;
    
    // Consider game phase
    const gameProgress = (aiPos.row + (8 - playerPos.row)) / 16;
    
    if (gameProgress < 0.3) {
        // Early game: establish position
        if (wallRow >= 2 && wallRow <= 6) score += 10;
    } else if (gameProgress > 0.7) {
        // Late game: focus on direct blocking
        if (playerPos.row <= 2 && playerIncrease > 2) score += 40;
    }
    
    // Wall efficiency (remaining walls consideration)
    const wallsLeft = gameState.wallsRemaining[this.player];
    if (wallsLeft <= 2) {
        // Be very selective with last walls
        if (playerIncrease < 3) score -= 30;
    }
    
    // Add small random factor to avoid predictability
    score += Math.random() * 5 - 2.5;
    
    return score;
}

// Helper methods remain mostly the same...

getAllValidWalls() {
    const walls = [];
    
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
        for (let c = 0; c < BOARD_SIZE - 1; c++) {
            // Check horizontal walls
            const hWall1 = { wallType: 'horizontal', row: r, col: c };
            const hWall2 = { wallType: 'horizontal', row: r, col: c + 1 };
            if (c < BOARD_SIZE - 2 && isValidWallPlacement(hWall1, hWall2)) {
                walls.push({ type: 'wall', seg1: hWall1, seg2: hWall2 });
            }
            
            // Check vertical walls
            const vWall1 = { wallType: 'vertical', row: r, col: c };
            const vWall2 = { wallType: 'vertical', row: r + 1, col: c };
            if (r < BOARD_SIZE - 2 && isValidWallPlacement(vWall1, vWall2)) {
                walls.push({ type: 'wall', seg1: vWall1, seg2: vWall2 });
            }
        }
    }
    
    return walls;
}

findRandomWall() {
    const walls = this.getAllValidWalls();
    return walls.length > 0 ? walls[Math.floor(Math.random() * walls.length)] : null;
}

simulateWallPlacement(wall) {
    const tempH = new Set(gameState.horizontalWalls);
    const tempV = new Set(gameState.verticalWalls);
    
    const seg1Key = `${wall.seg1.row}-${wall.seg1.col}`;
    const seg2Key = `${wall.seg2.row}-${wall.seg2.col}`;
    
    if (wall.seg1.wallType === 'horizontal') {
        tempH.add(seg1Key);
        tempH.add(seg2Key);
    } else {
        tempV.add(seg1Key);
        tempV.add(seg2Key);
    }
    
    return { horizontal: tempH, vertical: tempV };
}

calculateShortestPath(start, targetRow, walls) {
    const queue = [{ pos: start, distance: 0 }];
    const visited = new Set([`${start.row}-${start.col}`]);
    
    while (queue.length > 0) {
        const { pos, distance } = queue.shift();
        
        if (pos.row === targetRow) return distance;
        
        const directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        for (const dir of directions) {
            const next = { row: pos.row + dir.r, col: pos.col + dir.c };
            
            if (next.row < 0 || next.row >= BOARD_SIZE || next.col < 0 || next.col >= BOARD_SIZE) continue;
            
            const posKey = `${next.row}-${next.col}`;
            if (visited.has(posKey)) continue;
            
            let blocked = this.isWallBetweenPositions(pos, next, walls);
            
            if (!blocked) {
                visited.add(posKey);
                queue.push({ pos: next, distance: distance + 1 });
            }
        }
    }
    
    return -1; // No path found
}

isWallBetweenPositions(pos1, pos2, walls) {
    if (pos1.row === pos2.row) { // Horizontal move
        const wallCol = Math.min(pos1.col, pos2.col);
        return walls.vertical.has(`${pos1.row}-${wallCol}`);
    } else { // Vertical move
        const wallRow = Math.min(pos1.row, pos2.row);
        return walls.horizontal.has(`${wallRow}-${pos1.col}`);
    }
}

executePlayerMove(row, col) {
    const fromPos = { ...gameState.player2Position };
    const toPos = { row, col };
    
    gameState.player2Position = { row, col };
    
    animatePlayerMovement(2, fromPos, toPos, () => {
        endTurn();
    });
}

executeWallPlacement(seg1, seg2) {
    placeWall(seg1, seg2);
    endTurn();
}

}

// Global AI instance
window.aiPlayer = new QuoridorAI(‘medium’);