// --- AI PLAYER SYSTEM ---

class QuoridorAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.player = 2; // AI is always player 2
    }

    // Main AI decision making
    async makeMove() {
        if (gameState.winner || gameState.currentPlayer !== this.player || isAiThinking) return;
        
        isAiThinking = true;
        updateUI(); // Show AI thinking state
        
        // Add delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const move = this.calculateBestMove();
        
        if (move.type === 'move') {
            this.executePlayerMove(move.row, move.col);
        } else if (move.type === 'wall') {
            this.executeWallPlacement(move.seg1, move.seg2);
        }
        
        isAiThinking = false;
    }

    calculateBestMove() {
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

    // EASY AI: Random valid moves, occasional walls
    calculateEasyMove() {
        const validMoves = [...gameState.validMoves];
        
        // 20% chance to try placing a wall
        if (Math.random() < 0.2 && gameState.wallsRemaining[this.player] > 0) {
            const wallMove = this.findRandomWall();
            if (wallMove) return wallMove;
        }
        
        // Otherwise, move randomly
        if (validMoves.length > 0) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            return { type: 'move', row: randomMove.row, col: randomMove.col };
        }
        
        return this.calculateMediumMove(); // Fallback
    }

    // MEDIUM AI: Balanced strategy with some planning
    calculateMediumMove() {
        const validMoves = [...gameState.validMoves];
        const aiPos = gameState.player2Position;
        const playerPos = gameState.player1Position;
        
        // Check for winning move first
        for (const move of validMoves) {
            if (move.row === 8) { // AI wins by reaching row 8
                return { type: 'move', row: move.row, col: move.col };
            }
        }
        
        // Block player if they're close to winning
        if (playerPos.row <= 2) {
            const blockWall = this.findBlockingWall();
            if (blockWall && gameState.wallsRemaining[this.player] > 0) {
                return blockWall;
            }
        }
        
        // 40% chance to place strategic wall
        if (Math.random() < 0.4 && gameState.wallsRemaining[this.player] > 0) {
            const strategicWall = this.findStrategicWall();
            if (strategicWall) return strategicWall;
        }
        
        // Move towards goal, preferring center columns
        const bestMove = this.findBestProgressMove(validMoves, aiPos);
        return { type: 'move', row: bestMove.row, col: bestMove.col };
    }

    // HARD AI: Advanced strategy with minimax-like evaluation
    calculateHardMove() {
        const validMoves = [...gameState.validMoves];
        const aiPos = gameState.player2Position;
        const playerPos = gameState.player1Position;
        
        // Check for immediate win
        for (const move of validMoves) {
            if (move.row === 8) {
                return { type: 'move', row: move.row, col: move.col };
            }
        }
        
        // Always block if player is about to win
        if (playerPos.row <= 1) {
            const blockWall = this.findBlockingWall();
            if (blockWall && gameState.wallsRemaining[this.player] > 0) {
                return blockWall;
            }
        }
        
        // Evaluate all possible moves and walls
        let bestScore = -1000;
        let bestMove = null;
        
        // Evaluate movement options
        for (const move of validMoves) {
            const score = this.evaluatePosition(move, aiPos, playerPos);
            if (score > bestScore) {
                bestScore = score;
                bestMove = { type: 'move', row: move.row, col: move.col };
            }
        }
        
        // Evaluate wall options if we have walls remaining
        if (gameState.wallsRemaining[this.player] > 0) {
            const wallOptions = this.getAllValidWalls();
            for (const wall of wallOptions) {
                const score = this.evaluateWallPlacement(wall, aiPos, playerPos);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = wall;
                }
            }
        }
        
        return bestMove || { type: 'move', row: validMoves[0].row, col: validMoves[0].col };
    }

    // Helper methods
    findRandomWall() {
        const walls = this.getAllValidWalls();
        return walls.length > 0 ? walls[Math.floor(Math.random() * walls.length)] : null;
    }

    findBlockingWall() {
        const playerPos = gameState.player1Position;
        const walls = this.getAllValidWalls();
        
        // Find walls that increase player's distance to goal
        for (const wall of walls) {
            if (this.wouldBlockPlayerProgress(wall, playerPos)) {
                return wall;
            }
        }
        
        return null;
    }

    findStrategicWall() {
        const walls = this.getAllValidWalls();
        const aiPos = gameState.player2Position;
        const playerPos = gameState.player1Position;
        
        // Prefer walls that help AI while hindering player
        let bestWall = null;
        let bestScore = -100;
        
        for (const wall of walls) {
            let score = 0;
            
            // Prefer walls that slow down the player
            if (this.wouldSlowPlayer(wall, playerPos)) score += 30;
            
            // Avoid walls that significantly slow down AI
            if (this.wouldSlowAI(wall, aiPos)) score -= 20;
            
            // Prefer walls near the center
            const avgCol = (wall.seg1.col + wall.seg2.col) / 2;
            score += 10 - Math.abs(avgCol - 4) * 2;
            
            if (score > bestScore) {
                bestScore = score;
                bestWall = wall;
            }
        }
        
        return bestScore > 0 ? bestWall : null;
    }

    findBestProgressMove(validMoves, currentPos) {
        let bestMove = validMoves[0];
        let bestScore = -100;
        
        for (const move of validMoves) {
            let score = 0;
            
            // Prefer moves that get closer to goal (row 8)
            score += (move.row - currentPos.row) * 10;
            
            // Prefer moves towards center columns
            score += 5 - Math.abs(move.col - 4);
            
            // Small random factor
            score += Math.random() * 2;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    evaluatePosition(move, aiPos, playerPos) {
        let score = 0;
        
        // Distance to goal (higher row = better for AI)
        score += move.row * 20;
        
        // Prefer center columns
        score += 10 - Math.abs(move.col - 4) * 3;
        
        // Distance from player (sometimes good to be far)
        const distFromPlayer = Math.abs(move.row - playerPos.row) + Math.abs(move.col - playerPos.col);
        score += distFromPlayer * 2;
        
        return score;
    }

    evaluateWallPlacement(wall, aiPos, playerPos) {
        let score = 0;
        
        // Simulate wall placement and check path lengths
        const tempWalls = this.simulateWallPlacement(wall);
        const aiDistance = this.calculateShortestPath(aiPos, 8, tempWalls);
        const playerDistance = this.calculateShortestPath(playerPos, 0, tempWalls);
        
        if (aiDistance === -1) return -1000; // Invalid - blocks AI completely
        if (playerDistance === -1) return -1000; // Invalid - blocks player completely
        
        // Prefer walls that give AI advantage
        score += (playerDistance - aiDistance) * 10;
        
        // Prefer walls closer to player
        const wallRow = Math.min(wall.seg1.row, wall.seg2.row);
        score += (4 - Math.abs(wallRow - playerPos.row)) * 5;
        
        return score;
    }

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

    wouldBlockPlayerProgress(wall, playerPos) {
        const tempWalls = this.simulateWallPlacement(wall);
        const currentDistance = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const newDistance = this.calculateShortestPath(playerPos, 0, tempWalls);
        
        return newDistance > currentDistance;
    }

    wouldSlowPlayer(wall, playerPos) {
        return this.wouldBlockPlayerProgress(wall, playerPos);
    }

    wouldSlowAI(wall, aiPos) {
        const tempWalls = this.simulateWallPlacement(wall);
        const currentDistance = this.calculateShortestPath(aiPos, 8, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const newDistance = this.calculateShortestPath(aiPos, 8, tempWalls);
        
        return newDistance > currentDistance + 1; // Allow small increases
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
                
                // Use the same wall-checking logic as the main game
                let blocked = this.isWallBetweenPositions(pos, next, walls);
                
                if (!blocked) {
                    visited.add(posKey);
                    queue.push({ pos: next, distance: distance + 1 });
                }
            }
        }
        
        return -1; // No path found
    }

    // Helper method that mirrors the main game's isWallBetween function
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
        // Store the previous position for animation
        const fromPos = { ...gameState.player2Position };
        const toPos = { row, col };
        
        // Update game state immediately
        gameState.player2Position = { row, col };
        
        // Animate the movement, then end turn when animation completes
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
window.aiPlayer = new QuoridorAI('medium');