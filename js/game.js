import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Performance variables
let firstWallAnimationTime = 0;
let accentLight1, accentLight2; // Cache light references
let frameCount = 0; // Frame counter for performance optimization
let lastRenderTime = 0;
let targetFPS = 30; // Reduce target FPS for better performance
let frameInterval = 1000 / targetFPS;

// Initialize materials
window.materials = {
    board: new THREE.MeshStandardMaterial({ 
        color: 0x334455, 
        roughness: 0.4, 
        metalness: 0.6,
        emissive: 0x112233,
        emissiveIntensity: 0.15
    }),
    goal: new THREE.MeshStandardMaterial({ 
        color: 0x44ff88, 
        roughness: 0.2, 
        metalness: 0.7,
        emissive: 0x22ff44,
        emissiveIntensity: 0.4
    }),
    wall: new THREE.MeshStandardMaterial({ 
        color: 0x444444, 
        roughness: 0.4, 
        metalness: 0.8,
        emissive: 0x001144,
        emissiveIntensity: 0.1
    }),
    wallPlaceholder: new THREE.MeshStandardMaterial({ 
        color: 0x666699, 
        transparent: true, 
        opacity: 0.4,
        emissive: 0x0033ff,
        emissiveIntensity: 0.2
    }),
    highlightMove: new THREE.MeshStandardMaterial({ 
        color: 0x00ff88,
        emissive: 0x00ff44,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
    }),
    highlightWall: new THREE.MeshStandardMaterial({ 
        color: 0xaa00ff,
        emissive: 0x6600aa,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8
    }),
    highlightFirstWall: new THREE.MeshStandardMaterial({ 
        color: 0xff8800,
        emissive: 0xff4400,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 1.0
    }),
    highlightSecondWall: new THREE.MeshStandardMaterial({ 
        color: 0x00ff88,
        emissive: 0x00cc44,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8
    }),
};

// --- GAME STATE ---
function resetGameState() {
    window.gameState = {
        currentPlayer: 1,
        player1Position: { row: 8, col: 4 },
        player2Position: { row: 0, col: 4 },
        horizontalWalls: new Set(),
        verticalWalls: new Set(),
        wallsRemaining: { 1: window.WALLS_PER_PLAYER, 2: window.WALLS_PER_PLAYER },
        gameMode: 'move', // 'move' or 'wall'
        wallPlacementStage: 1,
        firstWallSegment: null,
        winner: null,
        validMoves: [],
    };
    calculateValidMoves();
}

// --- COORDINATE HELPERS ---
const posToCoords = (pos) => ({ x: window.BOARD_OFFSET + pos.col * window.CELL_SIZE, z: window.BOARD_OFFSET + pos.row * window.CELL_SIZE });
window.posToCoords = posToCoords;

// --- GAME LOGIC ---
function checkWinner() {
    if (window.gameState.player1Position.row === 0) return 1;
    if (window.gameState.player2Position.row === 8) return 2;
    return null;
}
window.checkWinner = checkWinner;

function isWallBetween(pos1, pos2) {
    // Only block if the wall is directly between the two cells
    if (pos1.row === pos2.row && Math.abs(pos1.col - pos2.col) === 1) { // Horizontal move (left/right)
        const minCol = Math.min(pos1.col, pos2.col);
        const row = pos1.row;
        // Vertical wall at (row, minCol) blocks movement between (row, minCol) and (row, minCol+1)
        const wallKey = `${row}-${minCol}`;
        const blocked = window.gameState.verticalWalls.has(wallKey);
        if (blocked) {
            console.log(`🚧 WALL BLOCKING: Horizontal move (${pos1.row},${pos1.col}) → (${pos2.row},${pos2.col}) blocked by vertical wall ${wallKey}`);
        }
        return blocked;
    } else if (pos1.col === pos2.col && Math.abs(pos1.row - pos2.row) === 1) { // Vertical move (up/down)
        // Only block if moving from (row, col) to (row+1, col) and there is a horizontal wall at (row, col)
        // Or moving from (row+1, col) to (row, col) and there is a horizontal wall at (row, col)
        let blocked = false;
        if (pos1.row < pos2.row) {
            // Moving down: check for wall at (pos1.row, pos1.col)
            blocked = window.gameState.horizontalWalls.has(`${pos1.row}-${pos1.col}`);
            if (blocked) {
                console.log(`🚧 WALL BLOCKING: Vertical move (${pos1.row},${pos1.col}) → (${pos2.row},${pos2.col}) blocked by horizontal wall ${pos1.row}-${pos1.col}`);
            }
        } else {
            // Moving up: check for wall at (pos2.row, pos2.col)
            blocked = window.gameState.horizontalWalls.has(`${pos2.row}-${pos2.col}`);
            if (blocked) {
                console.log(`🚧 WALL BLOCKING: Vertical move (${pos1.row},${pos1.col}) → (${pos2.row},${pos2.col}) blocked by horizontal wall ${pos2.row}-${pos2.col}`);
            }
        }
        return blocked;
    }
    // For non-adjacent moves (like jumps), don't block
    return false;
}
window.isWallBetween = isWallBetween;

function calculateValidMoves() {
    const moves = [];
    const pPos = window.gameState.currentPlayer === 1 ? window.gameState.player1Position : window.gameState.player2Position;
    const oPos = window.gameState.currentPlayer === 1 ? window.gameState.player2Position : window.gameState.player1Position;

    // Debug move calculation start
    console.log(`🔍 CALCULATING MOVES for Player ${window.gameState.currentPlayer}:`);
    console.log(`   Player position: (${pPos.row},${pPos.col})`);
    console.log(`   Opponent position: (${oPos.row},${oPos.col})`);

    const directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
    
    for (const dir of directions) {
        const nextPos = { row: pPos.row + dir.r, col: pPos.col + dir.c };
        if (nextPos.row < 0 || nextPos.row >= window.BOARD_SIZE || nextPos.col < 0 || nextPos.col >= window.BOARD_SIZE) continue;

        if (isWallBetween(pPos, nextPos)) continue;

        if (nextPos.row === oPos.row && nextPos.col === oPos.col) {
            // Opponent is in the way, check for jumps
            const jumpPos = { row: oPos.row + dir.r, col: oPos.col + dir.c };
            if (!isWallBetween(oPos, jumpPos) && jumpPos.row >=0 && jumpPos.row < window.BOARD_SIZE && jumpPos.col >= 0 && jumpPos.col < window.BOARD_SIZE) {
                moves.push(jumpPos);
                console.log(`   ↗️ Jump move added: (${jumpPos.row},${jumpPos.col})`);
            } else {
                // Wall behind opponent, check diagonal moves
                if (dir.r === 0) { // Horizontal move
                    const diag1 = {row: oPos.row - 1, col: oPos.col};
                    const diag2 = {row: oPos.row + 1, col: oPos.col};
                    if (!isWallBetween(oPos, diag1) && diag1.row >= 0) {
                        moves.push(diag1);
                        console.log(`   ↗️ Diagonal move added: (${diag1.row},${diag1.col})`);
                    }
                    if (!isWallBetween(oPos, diag2) && diag2.row < window.BOARD_SIZE) {
                        moves.push(diag2);
                        console.log(`   ↗️ Diagonal move added: (${diag2.row},${diag2.col})`);
                    }
                } else { // Vertical move
                    const diag1 = {row: oPos.row, col: oPos.col - 1};
                    const diag2 = {row: oPos.row, col: oPos.col + 1};
                    if (!isWallBetween(oPos, diag1) && diag1.col >= 0) {
                        moves.push(diag1);
                        console.log(`   ↗️ Diagonal move added: (${diag1.row},${diag1.col})`);
                    }
                    if (!isWallBetween(oPos, diag2) && diag2.col < window.BOARD_SIZE) {
                        moves.push(diag2);
                        console.log(`   ↗️ Diagonal move added: (${diag2.row},${diag2.col})`);
                    }
                }
            }
        } else {
            moves.push(nextPos);
            console.log(`   ✅ Normal move added: (${nextPos.row},${nextPos.col})`);
        }
    }
    // Filter out out-of-bounds moves from diagonal jumps
    window.gameState.validMoves = moves.filter(m => m && m.row >= 0 && m.row < window.BOARD_SIZE && m.col >= 0 && m.col < window.BOARD_SIZE);
    
    console.log(`   Final valid moves: ${window.gameState.validMoves.length} moves -`, window.gameState.validMoves.map(m => `(${m.row},${m.col})`));
}
window.calculateValidMoves = calculateValidMoves;

function hasPathToGoal(playerPos, targetRow, tempWalls) {
    // Input validation
    if (!playerPos || typeof targetRow !== 'number' || !tempWalls) return false;
    
    // If already at target row, path exists
    if (playerPos.row === targetRow) return true;
    
    const queue = [playerPos];
    const visited = new Set([`${playerPos.row}-${playerPos.col}`]);
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Check if we've reached the target row
        if (current.row === targetRow) return true;
        
        // Explore all four directions
        const directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        for (const dir of directions) {
            const next = { row: current.row + dir.r, col: current.col + dir.c };
            
            // Check bounds
            if (next.row < 0 || next.row >= window.BOARD_SIZE || next.col < 0 || next.col >= window.BOARD_SIZE) continue;
            
            const posKey = `${next.row}-${next.col}`;
            if (visited.has(posKey)) continue;

            // Check if move is blocked by a wall - use same logic as isWallBetween
            let blocked = false;
            if (current.row === next.row) { // Horizontal move (left/right)
                const minCol = Math.min(current.col, next.col);
                blocked = tempWalls.vertical && tempWalls.vertical.has(`${current.row}-${minCol}`);
            } else { // Vertical move (up/down)
                const minRow = Math.min(current.row, next.row);
                blocked = tempWalls.horizontal && tempWalls.horizontal.has(`${minRow}-${current.col}`);
            }
            
            // If not blocked, add to queue for exploration
            if (!blocked) {
                visited.add(posKey);
                queue.push(next);
            }
        }
    }
    
    // No path found to target row
    return false;
}

function isValidWallPlacement(first, second) {
    // Check if player has walls remaining
    if (window.gameState.wallsRemaining[window.gameState.currentPlayer] <= 0) return false;
    
    const firstKey = `${first.row}-${first.col}`;
    const secondKey = `${second.row}-${second.col}`;
    
    // Check if wall segments are already occupied
    const wallSet = first.wallType === 'horizontal' ? window.gameState.horizontalWalls : window.gameState.verticalWalls;
    if (wallSet.has(firstKey) || wallSet.has(secondKey)) return false;

    // Check for wall intersections (walls cannot cross each other)
    if (first.wallType === 'horizontal') {
        if (window.gameState.verticalWalls.has(`${first.row}-${first.col}`)) return false;
    } else { // vertical
        if (window.gameState.horizontalWalls.has(`${first.row}-${first.col}`)) return false;
    }

    // Create temporary wall configuration to test paths
    const tempH_Walls = new Set(window.gameState.horizontalWalls);
    const tempV_Walls = new Set(window.gameState.verticalWalls);
    
    if (first.wallType === 'horizontal') {
        tempH_Walls.add(firstKey);
        tempH_Walls.add(secondKey);
    } else {
        tempV_Walls.add(firstKey);
        tempV_Walls.add(secondKey);
    }
    
    const tempWalls = { horizontal: tempH_Walls, vertical: tempV_Walls };
    
    // CRITICAL RULE: Both players must always have a path to their goal
    console.log(`🔍 PATH VALIDATION: Checking if wall placement blocks any player's path`);
    console.log(`   Player 1 position: (${window.gameState.player1Position.row}, ${window.gameState.player1Position.col}) → Goal: row 0`);
    console.log(`   Player 2 position: (${window.gameState.player2Position.row}, ${window.gameState.player2Position.col}) → Goal: row 8`);
    console.log(`   Proposed wall: ${first.wallType} at ${firstKey}, ${secondKey}`);
    
    const player1HasPath = hasPathToGoal(window.gameState.player1Position, 0, tempWalls);
    const player2HasPath = hasPathToGoal(window.gameState.player2Position, 8, tempWalls);
    
    console.log(`   Player 1 has path to goal: ${player1HasPath}`);
    console.log(`   Player 2 has path to goal: ${player2HasPath}`);
    
    if (!player1HasPath) {
        console.log(`❌ WALL REJECTED: Would block Player 1's path to goal`);
        return false;
    }
    if (!player2HasPath) {
        console.log(`❌ WALL REJECTED: Would block Player 2's path to goal`);
        return false;
    }
    
    console.log(`✅ WALL VALIDATED: Both players maintain paths to their goals`);
    return true;
}
window.isValidWallPlacement = isValidWallPlacement;

function getPossibleSecondSegments(first) {
    const possibilities = [];
    const { wallType, row, col } = first;
    if (wallType === 'horizontal') {
        if (col > 0) possibilities.push({ wallType, row, col: col - 1 });
        if (col < window.BOARD_SIZE - 2) possibilities.push({ wallType, row, col: col + 1 });
    } else { // vertical
        if (row > 0) possibilities.push({ wallType, row: row - 1, col });
        if (row < window.BOARD_SIZE - 2) possibilities.push({ wallType, row: row + 1, col });
    }
    return possibilities;
}
window.getPossibleSecondSegments = getPossibleSecondSegments;

function handleCellClick(row, col) {
    if (window.gameState.winner || window.gameState.gameMode !== 'move') return;
    // Prevent moves during AI turn
    if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2) return;

    const currentPos = window.gameState.currentPlayer === 1 ? window.gameState.player1Position : window.gameState.player2Position;
    const isValid = window.gameState.validMoves.some(m => m.row === row && m.col === col);
    
    // Debug player click
    console.log(`🎯 PLAYER CLICK by Player ${window.gameState.currentPlayer}:`);
    console.log(`   From: (${currentPos.row},${currentPos.col})`);
    console.log(`   To: (${row},${col})`);
    console.log(`   Valid moves:`, window.gameState.validMoves.map(m => `(${m.row},${m.col})`));
    console.log(`   Move valid: ${isValid}`);
    
    if (isValid) {
        console.log(`✅ MOVE EXECUTED: Player ${window.gameState.currentPlayer} moved to (${row},${col})`);
        if (window.gameState.currentPlayer === 1) {
            window.gameState.player1Position = { row, col };
        } else {
            window.gameState.player2Position = { row, col };
        }
        endTurn();
    } else {
        console.log(`❌ MOVE BLOCKED: Player ${window.gameState.currentPlayer} cannot move to (${row},${col})`);
        
        // Check why the move was blocked
        if (Math.abs(currentPos.row - row) + Math.abs(currentPos.col - col) !== 1) {
            console.log(`   Reason: Not adjacent (distance > 1)`);
        } else if (isWallBetween(currentPos, { row, col })) {
            console.log(`   Reason: Wall blocks movement`);
            
            // Show which wall is blocking
            if (currentPos.row === row) { // Horizontal move
                const wallCol = Math.min(currentPos.col, col);
                const wallKey = `${currentPos.row}-${wallCol}`;
                console.log(`   Blocking wall: vertical wall at ${wallKey}`);
            } else { // Vertical move
                const wallRow = Math.min(currentPos.row, row);
                const wallKey = `${wallRow}-${currentPos.col}`;
                console.log(`   Blocking wall: horizontal wall at ${wallKey}`);
            }
        } else {
            console.log(`   Reason: Other player occupies that position or invalid jump`);
        }
    }
}

function handleWallClick(wallType, row, col) {
    if (window.gameState.winner || window.gameState.gameMode !== 'wall' || window.gameState.wallsRemaining[window.gameState.currentPlayer] <= 0) return;
    // Prevent moves during AI turn
    if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2) return;

    // Log which line between cubes was clicked
    if (wallType === 'horizontal') {
        console.log(`🖱️ WALL CLICK: Horizontal line between rows ${row} and ${row + 1}, columns ${col}-${col + 1}`);
    } else {
        console.log(`🖱️ WALL CLICK: Vertical line between columns ${col} and ${col + 1}, rows ${row}-${row + 1}`);
    }

    if (window.gameState.wallPlacementStage === 1) {
        const wallKey = `${row}-${col}`;
        const isOccupied = wallType === 'horizontal' ? window.gameState.horizontalWalls.has(wallKey) : window.gameState.verticalWalls.has(wallKey);
        if (!isOccupied) {
            console.log(`✅ First wall segment selected: ${wallType} at (${row},${col})`);
            window.gameState.firstWallSegment = { wallType, row, col };
            window.gameState.wallPlacementStage = 2;
            updateUI();
        }
    } else { // Stage 2
        const secondSegment = { wallType, row, col };
        const first = window.gameState.firstWallSegment;
        
        const possibleSeconds = getPossibleSecondSegments(first);
        const isAdjacent = possibleSeconds.some(p => p.wallType === wallType && p.row === row && p.col === col);

        if (isAdjacent && isValidWallPlacement(first, secondSegment)) {
            console.log(`✅ Second wall segment selected: ${wallType} at (${row},${col})`);
            placeWall(first, secondSegment);
            endTurn();
        } else {
            console.log(`❌ Invalid second wall segment: ${wallType} at (${row},${col})`);
        }
        window.gameState.wallPlacementStage = 1;
        window.gameState.firstWallSegment = null;
        setGameMode('move');
    }
}

function placeWall(seg1, seg2) {
    const wallSet = seg1.wallType === 'horizontal' ? window.gameState.horizontalWalls : window.gameState.verticalWalls;
    const seg1Key = `${seg1.row}-${seg1.col}`;
    const seg2Key = `${seg2.row}-${seg2.col}`;
    
    wallSet.add(seg1Key);
    wallSet.add(seg2Key);
    window.gameState.wallsRemaining[window.gameState.currentPlayer]--;
    
    // Debug wall placement
    console.log(`🧱 WALL PLACED by Player ${window.gameState.currentPlayer}:`);
    console.log(`   Type: ${seg1.wallType}`);
    console.log(`   Segments: ${seg1Key}, ${seg2Key}`);
    console.log(`   Walls remaining: P1=${window.gameState.wallsRemaining[1]}, P2=${window.gameState.wallsRemaining[2]}`);
    console.log(`   Total ${seg1.wallType} walls:`, Array.from(wallSet));
    
    // Create wall mesh based on the actual segments positions
    const minRow = Math.min(seg1.row, seg2.row);
    const minCol = Math.min(seg1.col, seg2.col);
    const maxRow = Math.max(seg1.row, seg2.row);
    const maxCol = Math.max(seg1.col, seg2.col);
    
    // Position wall to cover exactly the 2 segments without overflow
    console.log(`🎯 WALL POSITIONING CALCULATION:`);
    console.log(`   Segments: (${seg1.row},${seg1.col}) and (${seg2.row},${seg2.col})`);
    console.log(`   Min/Max: minRow=${minRow}, maxRow=${maxRow}, minCol=${minCol}, maxCol=${maxCol}`);
    
    // Calculate the center position between the two segments
    const centerRow = (minRow + maxRow) / 2;
    const centerCol = (minCol + maxCol) / 2;
    console.log(`   Wall center position: (${centerRow}, ${centerCol})`);
    addWallMesh(seg1.wallType, centerRow, centerCol);
}
window.placeWall = placeWall;

function endTurn() {
    const winner = checkWinner();
    if (winner) {
        console.log(`🏆 GAME WON by Player ${winner}!`);
        window.gameState.winner = winner;
        updateScene();
        updateUI();
        return;
    }
    
    const previousPlayer = window.gameState.currentPlayer;
    window.gameState.currentPlayer = window.gameState.currentPlayer === 1 ? 2 : 1;
    window.gameState.gameMode = 'move';
    
    console.log(`🔄 TURN END: Player ${previousPlayer} → Player ${window.gameState.currentPlayer}`);
    console.log(`   Player 1 pos: (${window.gameState.player1Position.row},${window.gameState.player1Position.col})`);
    console.log(`   Player 2 pos: (${window.gameState.player2Position.row},${window.gameState.player2Position.col})`);
    
    calculateValidMoves();
    updateScene();
    updateUI();
    
    // Trigger AI move if it's AI's turn
    setTimeout(() => {
        checkAiTurn();
    }, 100);
}
window.endTurn = endTurn;

// --- MESH & MODEL CREATION ---
async function loadPawns() {
    const loader = new GLTFLoader();
    const smokingUrl = 'https://shaharfullstack.github.io/gltfLoader/smoking.glb';
    const cornUrl = 'https://shaharfullstack.github.io/gltfLoader/corn.glb';

    const [smokingGltf, cornGltf] = await Promise.all([
        loader.loadAsync(smokingUrl),
        loader.loadAsync(cornUrl)
    ]);

    // Player 1 - enhanced shadow casting
    const smokingModel = smokingGltf.scene;
    smokingModel.scale.set(3, 3, 3);
    smokingModel.position.y = window.CUBE_HEIGHT + 1.5; // Set height above cubes
    smokingModel.rotation.y = Math.PI - Math.PI/4; // Rotate to face forward + 45 degrees right
    smokingModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Enhance material properties for better lighting
            if (child.material) {
                child.material.shadowSide = THREE.DoubleSide;
            }
        }
    });
    window.pawns[1] = smokingModel;

    // Player 2 - enhanced shadow casting
    const cornModel = cornGltf.scene;
    cornModel.scale.set(3, 3, 3);
    cornModel.position.y = window.CUBE_HEIGHT + 1.5; // Set height above cubes
    cornModel.rotation.y = -5*Math.PI/12; // 75 degrees right from default
    cornModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Enhance material properties for better lighting
            if (child.material) {
                child.material.shadowSide = THREE.DoubleSide;
            }
        }
    });
    window.pawns[2] = cornModel;
}

function addWallMesh(wallType, row, col) {
    const wallHeight = window.WALL_HEIGHT;
    const wallThickness = window.WALL_WIDTH;
    
    let geometry, position;
    
    if (wallType === 'horizontal') {
        // Horizontal wall spans 2 columns - match placeholder positioning exactly
        geometry = new THREE.BoxGeometry(window.CELL_SIZE * 2, wallHeight, wallThickness);
        position = {
            x: window.BOARD_OFFSET + col * window.CELL_SIZE + window.CELL_SIZE/2, // Same as placeholder
            y: wallHeight / 2,
            z: window.BOARD_OFFSET + row * window.CELL_SIZE + window.CELL_SIZE/2 // Same as placeholder
        };
    } else { // vertical  
        // Vertical wall spans 2 rows - match placeholder positioning exactly
        geometry = new THREE.BoxGeometry(wallThickness, wallHeight, window.CELL_SIZE * 2);
        position = {
            x: window.BOARD_OFFSET + col * window.CELL_SIZE + window.CELL_SIZE/2, // Same as placeholder
            y: wallHeight / 2,
            z: window.BOARD_OFFSET + row * window.CELL_SIZE + window.CELL_SIZE/2 // Same as placeholder
        };
    }
    
    // Log the actual world coordinates where the wall is placed
    console.log(`📍 WALL MESH PLACED:`);
    console.log(`   Type: ${wallType}`);
    console.log(`   Segment coordinates: (${row}, ${col})`);
    console.log(`   World position: x=${position.x}, z=${position.z}`);
    console.log(`   Calculation: BOARD_OFFSET=${window.BOARD_OFFSET}, CELL_SIZE=${window.CELL_SIZE}`);
    console.log(`   X calc: ${window.BOARD_OFFSET} + ${col} * ${window.CELL_SIZE} + ${window.CELL_SIZE/2} = ${position.x}`);
    console.log(`   Z calc: ${window.BOARD_OFFSET} + ${row} * ${window.CELL_SIZE} + ${window.CELL_SIZE/2} = ${position.z}`);
    
    const wallMesh = new THREE.Mesh(geometry, window.materials.wall);
    wallMesh.position.set(position.x, position.y, position.z);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallMesh.userData = { type: 'wall', wallType, row, col };
    
    window.wallsGroup.add(wallMesh);
}

function initScene3D() {
    window.scene = new THREE.Scene();
    window.scene.background = new THREE.Color(0x1a1a2e);
    window.scene.fog = new THREE.Fog(0x1a1a2e, 50, 100);

    window.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    window.camera.position.set(-10, 5, 15); // Left corner, much lower position

    window.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
    window.renderer.setSize(window.innerWidth, window.innerHeight);
    window.renderer.setPixelRatio(window.devicePixelRatio);
    window.renderer.shadowMap.enabled = true;
    window.renderer.shadowMap.type = THREE.BasicShadowMap; // Use basic shadows for better performance

    window.controls = new OrbitControls(window.camera, window.renderer.domElement);
    window.controls.target.set(0, 2, 0); // Look slightly above board center
    window.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Allow slightly lower angle
    window.controls.minDistance = 10;
    window.controls.maxDistance = 40;
    window.controls.enableDamping = true;
    window.controls.dampingFactor = 0.05;
    
    // Mobile-specific optimizations
    if (MobileControls.isMobileDevice()) {
        window.controls.enablePan = false; // Disable panning on mobile to prevent conflicts
        window.controls.rotateSpeed = 0.5; // Slower rotation for better control
        window.controls.zoomSpeed = 0.8; // Slower zoom for better control
        window.controls.minDistance = 8; // Allow closer zoom on mobile
        window.controls.maxDistance = 30; // Reduce max distance on mobile
        
        // Adjust damping for smoother mobile experience
        window.controls.enableDamping = true;
        window.controls.dampingFactor = 0.1;
    }

    // Enhanced lighting system - improved quality
    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(12, 30, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    mainLight.shadow.bias = -0.0005;
    window.scene.add(mainLight);
    
    // Accent lighting - softer (cached references for performance)
    accentLight1 = new THREE.PointLight(0xff6699, 0.8, 50);
    accentLight1.position.set(-15, 10, 15);
    window.scene.add(accentLight1);
    
    accentLight2 = new THREE.PointLight(0x66ff99, 0.8, 50);
    accentLight2.position.set(15, 10, -15);
    window.scene.add(accentLight2);
    
    // Ambient light with warmer tone
    window.scene.add(new THREE.AmbientLight(0x556677, 1));
    
    // Add fill light for better character visibility
    const fillLight = new THREE.DirectionalLight(0xaabbcc, 0.8);
    fillLight.position.set(-10, 15, -10);
    window.scene.add(fillLight);
    
    // Player spotlights - improved for better character lighting
    const player1Spotlight = new THREE.SpotLight(0x6699ff, 3, 20, Math.PI / 5, 0.2, 1.5);
    player1Spotlight.position.set(0, 15, 0);
    player1Spotlight.target.position.set(0, 0, 0);
    player1Spotlight.castShadow = true;
    player1Spotlight.shadow.mapSize.width = 1024;
    player1Spotlight.shadow.mapSize.height = 1024;
    player1Spotlight.shadow.bias = -0.0001;
    window.scene.add(player1Spotlight);
    window.scene.add(player1Spotlight.target);
    window.playerSpotlights[1] = player1Spotlight;
    
    const player2Spotlight = new THREE.SpotLight(0xff6699, 3, 20, Math.PI / 5, 0.2, 1.5);
    player2Spotlight.position.set(0, 15, 0);
    player2Spotlight.target.position.set(0, 0, 0);
    player2Spotlight.castShadow = true;
    player2Spotlight.shadow.mapSize.width = 1024;
    player2Spotlight.shadow.mapSize.height = 1024;
    player2Spotlight.shadow.bias = -0.0001;
    window.scene.add(player2Spotlight);
    window.scene.add(player2Spotlight.target);
    window.playerSpotlights[2] = player2Spotlight;

    window.boardGroup = new THREE.Group();
    window.wallsGroup = new THREE.Group();
    window.scene.add(window.boardGroup, window.wallsGroup);
    
    // Enhanced ground with grid pattern - lighter
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ 
            color: 0x223344,
            transparent: true,
            opacity: 0.9,
            roughness: 0.7,
            metalness: 0.3
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    window.scene.add(ground);
    
    // Grid effect - more visible
    const gridHelper = new THREE.GridHelper(100, 50, 0x4488ff, 0x225588);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.5;
    window.scene.add(gridHelper);
    
    // Create 3D cube cells instead of flat planes
    const cubeSize = window.CELL_SIZE - window.CUBE_GAP;
    const cellGeo = new THREE.BoxGeometry(cubeSize, window.CUBE_HEIGHT, cubeSize);
    
    for (let row = 0; row < window.BOARD_SIZE; row++) {
        for (let col = 0; col < window.BOARD_SIZE; col++) {
            const isGoalRow = row === 0 || row === 8;
            const cell = new THREE.Mesh(cellGeo, isGoalRow ? window.materials.goal : window.materials.board);
            
            const coords = posToCoords({row, col});
            cell.position.set(coords.x, window.CUBE_HEIGHT / 2, coords.z);
            
            cell.castShadow = true;
            cell.receiveShadow = true;
            cell.userData = { type: 'cell', row, col };
            
            // Add subtle random rotation for organic feel
            cell.rotation.y = (Math.random() - 0.5) * 0.1;
            
            window.boardGroup.add(cell);
            window.cellMeshes.push(cell);
        }
    }

    // Create wall placeholder planes above the cubes
    const wallPlaceholderHeight = window.CUBE_HEIGHT + 0.05;
    const hWallGeo = new THREE.PlaneGeometry(window.CELL_SIZE * 2, window.WALL_WIDTH);
    const vWallGeo = new THREE.PlaneGeometry(window.WALL_WIDTH, window.CELL_SIZE * 2);
    
    for (let r = 0; r < window.BOARD_SIZE - 1; r++) {
        for (let c = 0; c < window.BOARD_SIZE - 1; c++) {
            // Horizontal wall placeholder
            const hPlane = new THREE.Mesh(hWallGeo, window.materials.wallPlaceholder);
            hPlane.rotation.x = -Math.PI / 2;
            hPlane.position.set(
                window.BOARD_OFFSET + c * window.CELL_SIZE + window.CELL_SIZE/2, 
                wallPlaceholderHeight, 
                window.BOARD_OFFSET + r * window.CELL_SIZE + window.CELL_SIZE/2
            );
            hPlane.userData = { type: 'h_wall_placeholder', wallType: 'horizontal', row: r, col: c };
            hPlane.visible = false; // Initially hidden
            window.boardGroup.add(hPlane);
            window.hWallPlanes.push(hPlane);
            
            // Vertical wall placeholder
            const vPlane = new THREE.Mesh(vWallGeo, window.materials.wallPlaceholder);
            vPlane.rotation.x = -Math.PI / 2;
            vPlane.position.set(
                window.BOARD_OFFSET + c * window.CELL_SIZE + window.CELL_SIZE/2, 
                wallPlaceholderHeight, 
                window.BOARD_OFFSET + r * window.CELL_SIZE + window.CELL_SIZE/2
            );
            vPlane.userData = { type: 'v_wall_placeholder', wallType: 'vertical', row: r, col: c };
            vPlane.visible = false; // Initially hidden
            window.boardGroup.add(vPlane);
            window.vWallPlanes.push(vPlane);
        }
    }

    window.raycaster = new THREE.Raycaster();
    window.mouse = new THREE.Vector2();
}

function resetGame() {
    window.wallsGroup.clear();
    resetGameState();
    updateScene();
    updateUI();
}
window.resetGame = resetGame;

// --- EVENT LISTENERS ---
function onWindowResize() {
    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    window.renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    window.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    window.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
    if (window.gameState.winner) return;
    window.raycaster.setFromCamera(window.mouse, window.camera);
    
    // Check both board group and walls group for clicks
    const boardIntersects = window.raycaster.intersectObjects(window.boardGroup.children, true);
    const wallIntersects = window.raycaster.intersectObjects(window.wallsGroup.children, true);
    const allIntersects = [...boardIntersects, ...wallIntersects].sort((a, b) => a.distance - b.distance);
    
    if (allIntersects.length > 0) {
        const { userData } = allIntersects[0].object;
        if(userData.type === 'cell') {
            handleCellClick(userData.row, userData.col);
        } else if (userData.type?.includes('wall_placeholder')) {
            handleWallClick(userData.wallType, userData.row, userData.col);
        } else if (userData.type === 'wall') {
            console.log(`Clicked on wall: ${userData.wallType} at (${userData.row}, ${userData.col})`);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = Date.now();
    
    // Throttle to target FPS
    if (currentTime - lastRenderTime < frameInterval) {
        return;
    }
    
    lastRenderTime = currentTime;
    window.controls.update();
    frameCount++;
    
    const time = currentTime * 0.001;
    
    // Reduce animation frequency even more
    if (frameCount % 4 === 0) {
        // Animate first wall segment pulsing (every 4th frame)
        if (window.gameState.gameMode === 'wall' && window.gameState.wallPlacementStage === 2 && window.gameState.firstWallSegment) {
            const first = window.gameState.firstWallSegment;
            const firstPlane = (first.wallType === 'horizontal' ? window.hWallPlanes : window.vWallPlanes)
                .find(p => p.userData.row === first.row && p.userData.col === first.col);
            if (firstPlane && firstPlane.material.emissiveIntensity !== undefined) {
                firstPlane.material.emissiveIntensity = 0.8 + Math.sin(time * 4) * 0.3;
            }
        }
        
        // Animate accent lights less frequently
        if (accentLight1) {
            accentLight1.position.y = 10 + Math.sin(time * 0.7) * 3;
            accentLight1.intensity = 1 + Math.sin(time * 1.2) * 0.3;
        }
        if (accentLight2) {
            accentLight2.position.y = 10 + Math.cos(time * 0.8) * 3;
            accentLight2.intensity = 1 + Math.cos(time * 1.1) * 0.3;
        }
    }

    // Only do raycasting every 6 frames for hover effects
    if (!window.gameState.winner && frameCount % 6 === 0) {
        window.raycaster.setFromCamera(window.mouse, window.camera);
        const intersects = window.raycaster.intersectObjects(window.boardGroup.children, true);
        if (intersects.length > 0) {
            const newHovered = intersects[0].object;
            if (window.hoveredObject !== newHovered) {
                if (window.hoveredObject && window.hoveredObject.material.emissive) {
                    window.hoveredObject.material.emissive.setHex(0x000000);
                }
                window.hoveredObject = newHovered;
                if (window.hoveredObject.material.emissive) {
                    window.hoveredObject.material.emissive.setHex(0x004488);
                }
            }
        } else {
            if (window.hoveredObject && window.hoveredObject.material.emissive) {
                window.hoveredObject.material.emissive.setHex(0x000000);
            }
            window.hoveredObject = null;
        }
    }

    window.renderer.render(window.scene, window.camera);
}

// --- INITIALIZATION ---
async function initGame() {
    createStarField();
    initScene3D();
    
    await loadPawns();
    window.boardGroup.add(window.pawns[1], window.pawns[2]);
    
    // Show game mode selection initially
    showGameModeSelection();
    
    animate();
    
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    document.getElementById('move-btn').addEventListener('click', () => setGameMode('move'));
    document.getElementById('wall-btn').addEventListener('click', () => setGameMode('wall'));
    document.getElementById('reset-btn').addEventListener('click', showGameModeSelection);
    document.getElementById('language-toggle').addEventListener('click', switchLanguage);
    
    // Initialize language system
    updateAllText();
}

// Initialize the game
initGame();