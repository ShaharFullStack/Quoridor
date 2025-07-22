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
    if (pos1.row === pos2.row) { // Horizontal move
        const wallCol = Math.min(pos1.col, pos2.col);
        return window.gameState.verticalWalls.has(`${pos1.row}-${wallCol}`);
    } else { // Vertical move
        const wallRow = Math.min(pos1.row, pos2.row);
        return window.gameState.horizontalWalls.has(`${wallRow}-${pos1.col}`);
    }
}
window.isWallBetween = isWallBetween;

function calculateValidMoves() {
    const moves = [];
    const pPos = window.gameState.currentPlayer === 1 ? window.gameState.player1Position : window.gameState.player2Position;
    const oPos = window.gameState.currentPlayer === 1 ? window.gameState.player2Position : window.gameState.player1Position;

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
            } else {
                // Wall behind opponent, check diagonal moves
                if (dir.r === 0) { // Horizontal move
                    if (!isWallBetween(oPos, {row: oPos.row - 1, col: oPos.col})) moves.push({row: oPos.row - 1, col: oPos.col});
                    if (!isWallBetween(oPos, {row: oPos.row + 1, col: oPos.col})) moves.push({row: oPos.row + 1, col: oPos.col});
                } else { // Vertical move
                    if (!isWallBetween(oPos, {row: oPos.row, col: oPos.col - 1})) moves.push({row: oPos.row, col: oPos.col - 1});
                    if (!isWallBetween(oPos, {row: oPos.row, col: oPos.col + 1})) moves.push({row: oPos.row, col: oPos.col + 1});
                }
            }
        } else {
            moves.push(nextPos);
        }
    }
    // Filter out out-of-bounds moves from diagonal jumps
    window.gameState.validMoves = moves.filter(m => m && m.row >= 0 && m.row < window.BOARD_SIZE && m.col >= 0 && m.col < window.BOARD_SIZE);
}
window.calculateValidMoves = calculateValidMoves;

function hasPathToGoal(playerPos, targetRow, tempWalls) {
    const queue = [playerPos];
    const visited = new Set([`${playerPos.row}-${playerPos.col}`]);
    
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.row === targetRow) return true;
        
        const directions = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        for (const dir of directions) {
            const next = { row: current.row + dir.r, col: current.col + dir.c };
            if (next.row < 0 || next.row >= window.BOARD_SIZE || next.col < 0 || next.col >= window.BOARD_SIZE) continue;
            
            const posKey = `${next.row}-${next.col}`;
            if (visited.has(posKey)) continue;

            let blocked = false;
            if (next.row !== current.row) { // Vertical move
                const wallRow = Math.min(current.row, next.row);
                blocked = tempWalls.horizontal.has(`${wallRow}-${current.col}`);
            } else { // Horizontal move
                const wallCol = Math.min(current.col, next.col);
                blocked = tempWalls.vertical.has(`${current.row}-${wallCol}`);
            }
            
            if (!blocked) {
                visited.add(posKey);
                queue.push(next);
            }
        }
    }
    return false;
}

function isValidWallPlacement(first, second) {
    if (window.gameState.wallsRemaining[window.gameState.currentPlayer] <= 0) return false;
    
    const firstKey = `${first.row}-${first.col}`;
    const secondKey = `${second.row}-${second.col}`;
    
    const wallSet = first.wallType === 'horizontal' ? window.gameState.horizontalWalls : window.gameState.verticalWalls;
    if (wallSet.has(firstKey) || wallSet.has(secondKey)) return false;

    if (first.wallType === 'horizontal') {
        if (window.gameState.verticalWalls.has(`${first.row}-${first.col}`)) return false;
    } else { // vertical
        if (window.gameState.horizontalWalls.has(`${first.row}-${first.col}`)) return false;
    }

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
    return hasPathToGoal(window.gameState.player1Position, 0, tempWalls) &&
           hasPathToGoal(window.gameState.player2Position, 8, tempWalls);
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

    const isValid = window.gameState.validMoves.some(m => m.row === row && m.col === col);
    if (isValid) {
        if (window.gameState.currentPlayer === 1) {
            window.gameState.player1Position = { row, col };
        } else {
            window.gameState.player2Position = { row, col };
        }
        endTurn();
    }
}

function handleWallClick(wallType, row, col) {
    if (window.gameState.winner || window.gameState.gameMode !== 'wall' || window.gameState.wallsRemaining[window.gameState.currentPlayer] <= 0) return;
    // Prevent moves during AI turn
    if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2) return;

    if (window.gameState.wallPlacementStage === 1) {
        const wallKey = `${row}-${col}`;
        const isOccupied = wallType === 'horizontal' ? window.gameState.horizontalWalls.has(wallKey) : window.gameState.verticalWalls.has(wallKey);
        if (!isOccupied) {
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
            placeWall(first, secondSegment);
            endTurn();
        }
        window.gameState.wallPlacementStage = 1;
        window.gameState.firstWallSegment = null;
        setGameMode('move');
    }
}

function placeWall(seg1, seg2) {
    const wallSet = seg1.wallType === 'horizontal' ? window.gameState.horizontalWalls : window.gameState.verticalWalls;
    wallSet.add(`${seg1.row}-${seg1.col}`);
    wallSet.add(`${seg2.row}-${seg2.col}`);
    window.gameState.wallsRemaining[window.gameState.currentPlayer]--;
    
    // Create wall mesh based on the actual segments positions
    const minRow = Math.min(seg1.row, seg2.row);
    const minCol = Math.min(seg1.col, seg2.col);
    addWallMesh(seg1.wallType, minRow, minCol);
}
window.placeWall = placeWall;

function endTurn() {
    const winner = checkWinner();
    if (winner) {
        window.gameState.winner = winner;
        updateScene();
        updateUI();
        return;
    }
    window.gameState.currentPlayer = window.gameState.currentPlayer === 1 ? 2 : 1;
    window.gameState.gameMode = 'move';
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

function addWallMesh(type, row, col) {
    // Create a wall that spans 2 segments (2 grid positions)
    const wallGeo = new THREE.BoxGeometry(
        type === 'horizontal' ? window.CELL_SIZE * 2 - window.WALL_WIDTH : window.WALL_WIDTH,
        window.WALL_HEIGHT,
        type === 'horizontal' ? window.WALL_WIDTH : window.CELL_SIZE * 2 - window.WALL_WIDTH
    );
    const wallMesh = new THREE.Mesh(wallGeo, window.materials.wall);
    
    // Position the wall centered between the segments
    // For horizontal walls: center between col and col+1
    // For vertical walls: center between row and row+1
    const wallX = window.BOARD_OFFSET + col * window.CELL_SIZE + (type === 'horizontal' ? window.CELL_SIZE : 0) + window.CELL_SIZE / 2;
    const wallZ = window.BOARD_OFFSET + row * window.CELL_SIZE + (type === 'vertical' ? window.CELL_SIZE : 0) + window.CELL_SIZE / 2;
    
    wallMesh.position.set(
        wallX,
        window.WALL_HEIGHT / 2 + window.CUBE_HEIGHT,
        wallZ
    );
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
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
    window.controls.minDistance = 12;
    window.controls.maxDistance = 35;
    window.controls.enableDamping = true;

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
    const intersects = window.raycaster.intersectObjects(window.boardGroup.children, true);
    if (intersects.length > 0) {
        const { userData } = intersects[0].object;
        if(userData.type === 'cell') {
            handleCellClick(userData.row, userData.col);
        } else if (userData.type?.includes('wall_placeholder')) {
            handleWallClick(userData.wallType, userData.row, userData.col);
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