
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

        // Calculate shortest paths
        const aiCurrentPath = this.calculateShortestPath(aiPos, 8, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const playerCurrentPath = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });

        // Aggressive blocking if player is ahead or close to winning
        if (playerCurrentPath <= aiCurrentPath || playerPos.row <= 3) {
            const blockWall = this.findBestBlockingWall();
            if (blockWall && gameState.wallsRemaining[this.player] > 0) {
                return blockWall;
            }
        }

        // Strategic wall placement when ahead
        if (aiCurrentPath < playerCurrentPath && gameState.wallsRemaining[this.player] > 2) {
            const strategicWall = this.findAdvancedStrategicWall();
            if (strategicWall) return strategicWall;
        }

        // Move with tactical awareness
        const bestMove = this.findTacticalMove(validMoves, aiPos, playerPos);
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

        // Calculate current game state
        const aiCurrentPath = this.calculateShortestPath(aiPos, 8, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const playerCurrentPath = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });

        // Critical blocking - always block if player is about to win
        if (playerPos.row <= 1 || (playerCurrentPath <= 2 && playerCurrentPath < aiCurrentPath)) {
            const criticalBlock = this.findCriticalBlockingWall();
            if (criticalBlock && gameState.wallsRemaining[this.player] > 0) {
                return criticalBlock;
            }
        }

        // Minimax-style evaluation with 2-move lookahead
        let bestScore = -10000;
        let bestMove = null;

        // Evaluate all moves with lookahead
        for (const move of validMoves) {
            const score = this.evaluatePositionWithLookahead(move, aiPos, playerPos, 2);
            if (score > bestScore) {
                bestScore = score;
                bestMove = { type: 'move', row: move.row, col: move.col };
            }
        }

        // Evaluate wall options with strategic analysis
        if (gameState.wallsRemaining[this.player] > 0) {
            const strategicWalls = this.getStrategicWalls();
            for (const wall of strategicWalls) {
                const score = this.evaluateWallWithLookahead(wall, aiPos, playerPos);
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

    findBestBlockingWall() {
        const playerPos = gameState.player1Position;
        const walls = this.getAllValidWalls();
        let bestWall = null;
        let maxDelay = 0;

        // Find wall that maximally delays player while minimally affecting AI
        for (const wall of walls) {
            const playerDelay = this.calculatePlayerDelay(wall, playerPos);
            const aiDelay = this.calculateAIDelay(wall);
            
            const netBenefit = playerDelay - aiDelay;
            if (netBenefit > maxDelay) {
                maxDelay = netBenefit;
                bestWall = wall;
            }
        }

        return bestWall;
    }

    findCriticalBlockingWall() {
        const playerPos = gameState.player1Position;
        const walls = this.getAllValidWalls();
        let bestWall = null;
        let maxDelay = 0;

        // Prioritize walls that block immediate winning paths
        for (const wall of walls) {
            if (this.blocksImmediateWin(wall, playerPos)) {
                const delay = this.calculatePlayerDelay(wall, playerPos);
                if (delay > maxDelay) {
                    maxDelay = delay;
                    bestWall = wall;
                }
            }
        }

        return bestWall || this.findBestBlockingWall();
    }

    findAdvancedStrategicWall() {
        const walls = this.getAllValidWalls();
        const aiPos = gameState.player2Position;
        const playerPos = gameState.player1Position;

        let bestWall = null;
        let bestScore = -100;

        for (const wall of walls) {
            let score = 0;

            // Calculate path length changes
            const playerDelay = this.calculatePlayerDelay(wall, playerPos);
            const aiDelay = this.calculateAIDelay(wall);
            
            score += playerDelay * 40 - aiDelay * 30;

            // Prefer controlling key corridors
            if (this.controlsKeyCorridor(wall)) score += 25;
            
            // Prefer walls that force player into suboptimal paths
            if (this.forcesSuboptimalPath(wall, playerPos)) score += 35;

            // Position-based scoring
            const wallPosition = this.getWallCenterPosition(wall);
            
            // Prefer walls closer to player's current position
            const distToPlayer = Math.abs(wallPosition.row - playerPos.row) + Math.abs(wallPosition.col - playerPos.col);
            score += Math.max(0, 10 - distToPlayer * 2);

            // Prefer walls that create chokepoints
            if (this.createsChokepoint(wall)) score += 20;

            if (score > bestScore) {
                bestScore = score;
                bestWall = wall;
            }
        }

        return bestScore > 15 ? bestWall : null;
    }

    findTacticalMove(validMoves, aiPos, playerPos) {
        let bestMove = validMoves[0];
        let bestScore = -1000;

        for (const move of validMoves) {
            let score = 0;

            // Primary: Progress toward goal
            const progressValue = (move.row - aiPos.row) * 50;
            score += progressValue;

            // Calculate shortest path from this position
            const pathLength = this.calculateShortestPath(move, 8, {
                horizontal: gameState.horizontalWalls,
                vertical: gameState.verticalWalls
            });
            score += (20 - pathLength) * 10; // Shorter path = higher score

            // Tactical positioning
            const playerDistance = Math.abs(move.row - playerPos.row) + Math.abs(move.col - playerPos.col);
            
            // Maintain optimal distance from player
            if (playerDistance >= 2 && playerDistance <= 4) score += 15;
            else if (playerDistance < 2) score -= 10; // Too close
            else score -= 5; // Too far

            // Prefer moves that maintain multiple path options
            const pathOptions = this.countAvailablePaths(move);
            score += pathOptions * 8;

            // Center column preference (but not as dominant)
            score += Math.max(0, 8 - Math.abs(move.col - 4) * 2);

            // Avoid corners and edges
            if (move.row === 0 || move.row === 8 || move.col === 0 || move.col === 8) {
                score -= 12;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    evaluatePositionWithLookahead(move, aiPos, playerPos, depth) {
        if (depth === 0) {
            return this.staticPositionEvaluation(move, aiPos, playerPos);
        }

        let score = this.staticPositionEvaluation(move, aiPos, playerPos);

        // Simulate opponent's best response
        const opponentMoves = this.getValidMovesForPosition(playerPos);
        let worstOpponentScore = 1000;

        for (const oppMove of opponentMoves) {
            // Recursively evaluate opponent's move
            const oppScore = this.evaluatePositionWithLookahead(
                oppMove, move, oppMove, depth - 1
            );
            worstOpponentScore = Math.min(worstOpponentScore, oppScore);
        }

        // Minimax: assume opponent plays optimally against us
        return score - worstOpponentScore * 0.7;
    }

    staticPositionEvaluation(move, aiPos, playerPos) {
        let score = 0;

        // Path length evaluation
        const aiPathLength = this.calculateShortestPath(move, 8, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const playerPathLength = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });

        // Winning condition
        if (move.row === 8) return 10000;
        
        // Path advantage
        score += (playerPathLength - aiPathLength) * 100;
        
        // Progress bonus
        score += move.row * 30;
        
        // Positional factors
        const centerBonus = Math.max(0, 15 - Math.abs(move.col - 4) * 3);
        score += centerBonus;
        
        // Mobility (number of available moves from position)
        const mobility = this.getValidMovesForPosition(move).length;
        score += mobility * 8;

        return score;
    }

    evaluateWallWithLookahead(wall, aiPos, playerPos) {
        // Simulate wall placement
        const tempWalls = this.simulateWallPlacement(wall);
        const aiDistance = this.calculateShortestPath(aiPos, 8, tempWalls);
        const playerDistance = this.calculateShortestPath(playerPos, 0, tempWalls);

        if (aiDistance === -1) return -10000; // Invalid - blocks AI completely
        if (playerDistance === -1) return -10000; // Invalid - blocks player completely

        let score = 0;

        // Path length advantage
        const currentAiPath = this.calculateShortestPath(aiPos, 8, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const currentPlayerPath = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });

        const aiDelay = aiDistance - currentAiPath;
        const playerDelay = playerDistance - currentPlayerPath;
        
        score += (playerDelay - aiDelay) * 150;

        // Strategic position control
        if (this.controlsKeyCorridor(wall)) score += 80;
        if (this.createsChokepoint(wall)) score += 60;
        if (this.forcesSuboptimalPath(wall, playerPos)) score += 100;

        // Timing considerations
        if (currentPlayerPath < currentAiPath) {
            score += playerDelay * 50; // Bonus for slowing down leading opponent
        }

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

        const seg1Key = wall.seg1.row + '-' + wall.seg1.col;
        const seg2Key = wall.seg2.row + '-' + wall.seg2.col;

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
        const visited = new Set([start.row + '-' + start.col]);

        while (queue.length > 0) {
            const current = queue.shift();
            const pos = current.pos;
            const distance = current.distance;

            if (pos.row === targetRow) return distance;

            const directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
            for (let i = 0; i < directions.length; i++) {
                const dir = directions[i];
                const nextPos = { row: pos.row + dir.r, col: pos.col + dir.c };

                if (nextPos.row < 0 || nextPos.row >= BOARD_SIZE || nextPos.col < 0 || nextPos.col >= BOARD_SIZE) continue;

                const posKey = nextPos.row + '-' + nextPos.col;
                if (visited.has(posKey)) continue;

                // Use the same wall-checking logic as the main game
                let blocked = this.isWallBetweenPositions(pos, nextPos, walls);

                if (!blocked) {
                    visited.add(posKey);
                    queue.push({ pos: nextPos, distance: distance + 1 });
                }
            }
        }

        return -1; // No path found
    }

    // Helper method that mirrors the main game's isWallBetween function
    isWallBetweenPositions(pos1, pos2, walls) {
        if (pos1.row === pos2.row) { // Horizontal move
            const wallCol = Math.min(pos1.col, pos2.col);
            return walls.vertical.has(pos1.row + '-' + wallCol);
        } else { // Vertical move
            const wallRow = Math.min(pos1.row, pos2.row);
            return walls.horizontal.has(wallRow + '-' + pos1.col);
        }
    }

    // New advanced helper methods
    calculatePlayerDelay(wall, playerPos) {
        const currentPath = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const tempWalls = this.simulateWallPlacement(wall);
        const newPath = this.calculateShortestPath(playerPos, 0, tempWalls);
        return Math.max(0, newPath - currentPath);
    }

    calculateAIDelay(wall) {
        const aiPos = gameState.player2Position;
        const currentPath = this.calculateShortestPath(aiPos, 8, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        const tempWalls = this.simulateWallPlacement(wall);
        const newPath = this.calculateShortestPath(aiPos, 8, tempWalls);
        return Math.max(0, newPath - currentPath);
    }

    blocksImmediateWin(wall, playerPos) {
        if (playerPos.row > 2) return false;
        
        const tempWalls = this.simulateWallPlacement(wall);
        const newPath = this.calculateShortestPath(playerPos, 0, tempWalls);
        return newPath > 2; // If player needs more than 2 moves after wall
    }

    controlsKeyCorridor(wall) {
        const centerCols = [3, 4, 5];
        const wallCenter = this.getWallCenterPosition(wall);
        return centerCols.includes(Math.floor(wallCenter.col));
    }

    forcesSuboptimalPath(wall, playerPos) {
        const tempWalls = this.simulateWallPlacement(wall);
        const newPath = this.calculateShortestPath(playerPos, 0, tempWalls);
        const currentPath = this.calculateShortestPath(playerPos, 0, {
            horizontal: gameState.horizontalWalls,
            vertical: gameState.verticalWalls
        });
        return newPath >= currentPath + 2;
    }

    createsChokepoint(wall) {
        // Check if wall creates a bottleneck in player movement
        const wallCenter = this.getWallCenterPosition(wall);
        if (wall.seg1.wallType === 'horizontal') {
            // Horizontal wall creates chokepoint if it's in middle rows
            return wallCenter.row >= 3 && wallCenter.row <= 5;
        } else {
            // Vertical wall creates chokepoint if it's in middle columns
            return wallCenter.col >= 3 && wallCenter.col <= 5;
        }
    }

    getWallCenterPosition(wall) {
        return {
            row: (wall.seg1.row + wall.seg2.row) / 2,
            col: (wall.seg1.col + wall.seg2.col) / 2
        };
    }

    countAvailablePaths(position) {
        const directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        let count = 0;
        
        for (const dir of directions) {
            const nextPos = { row: position.row + dir.r, col: position.col + dir.c };
            if (nextPos.row >= 0 && nextPos.row < BOARD_SIZE && 
                nextPos.col >= 0 && nextPos.col < BOARD_SIZE) {
                
                const blocked = this.isWallBetweenPositions(position, nextPos, {
                    horizontal: gameState.horizontalWalls,
                    vertical: gameState.verticalWalls
                });
                
                if (!blocked) count++;
            }
        }
        
        return count;
    }

    getValidMovesForPosition(position) {
        const moves = [];
        const directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        
        for (const dir of directions) {
            const nextPos = { row: position.row + dir.r, col: position.col + dir.c };
            if (nextPos.row >= 0 && nextPos.row < BOARD_SIZE && 
                nextPos.col >= 0 && nextPos.col < BOARD_SIZE) {
                
                const blocked = this.isWallBetweenPositions(position, nextPos, {
                    horizontal: gameState.horizontalWalls,
                    vertical: gameState.verticalWalls
                });
                
                if (!blocked) moves.push(nextPos);
            }
        }
        
        return moves;
    }

    getStrategicWalls() {
        // Return subset of most promising walls for hard AI
        const allWalls = this.getAllValidWalls();
        const playerPos = gameState.player1Position;
        const aiPos = gameState.player2Position;
        
        return allWalls.filter(wall => {
            const wallCenter = this.getWallCenterPosition(wall);
            const distToPlayer = Math.abs(wallCenter.row - playerPos.row) + Math.abs(wallCenter.col - playerPos.col);
            const distToAI = Math.abs(wallCenter.row - aiPos.row) + Math.abs(wallCenter.col - aiPos.col);
            
            // Focus on walls closer to player than to AI, or in strategic positions
            return distToPlayer <= 4 || this.controlsKeyCorridor(wall) || this.createsChokepoint(wall);
        }).slice(0, 20); // Limit to top 20 candidates for performance
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