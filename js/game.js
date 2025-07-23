import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let firstWallAnimationTime = 0;
let frameCount = 0;
let lastRenderTime = 0;

let targetFPS = 30;
let frameInterval = 1000 / targetFPS;

window.materials = {
    board: new THREE.MeshPhysicalMaterial({ 
        color: 0x2d4a6b, 
        roughness: 0.3, 
        metalness: 0.1,
        emissive: 0x0a1c2e,
        emissiveIntensity: 0.1,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1,
        reflectivity: 0.5
    }),
    goal: new THREE.MeshPhysicalMaterial({ 
        color: 0x4ade80, 
        roughness: 0.1, 
        metalness: 0.2,
        emissive: 0x16a34a,
        emissiveIntensity: 0.3,
        transmission: 0.1,
        thickness: 0.5,
        clearcoat: 0.5
    }),
    wall: new THREE.MeshPhysicalMaterial({ 
        color: 0x1f2937, 
        roughness: 0.2, 
        metalness: 0.8,
        emissive: 0x0f172a,
        emissiveIntensity: 0.05,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1
    }),
    wallPlaceholder: new THREE.MeshPhysicalMaterial({ 
        color: 0x60a5fa, 
        transparent: true, 
        opacity: 0.5,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.3,
        transmission: 0.2,
        thickness: 0.3
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

// Resets the game state to initial values
function resetGameState() {
    window.gameState = {
        currentPlayer: 1,
        player1Position: { row: 8, col: 4 },
        player2Position: { row: 0, col: 4 },
        horizontalWalls: new Set(),
        verticalWalls: new Set(),
        wallsRemaining: { 1: window.WALLS_PER_PLAYER, 2: window.WALLS_PER_PLAYER },
        gameMode: 'move',
        winner: null,
        validMoves: [],
    };
    calculateValidMoves();
}

// Converts position to coordinates
const posToCoords = (pos) => ({ x: window.BOARD_OFFSET + pos.col * window.CELL_SIZE, z: window.BOARD_OFFSET + pos.row * window.CELL_SIZE });
window.posToCoords = posToCoords;

// Checks if there is a winner
function checkWinner() {
    if (window.gameState.player1Position.row === 0) return 1;
    if (window.gameState.player2Position.row === 8) return 2;
    return null;
}
window.checkWinner = checkWinner;

// Checks if a wall blocks movement
function isWallBetween(pos1, pos2) {
    if (pos1.row === pos2.row && Math.abs(pos1.col - pos2.col) === 1) {
        const minCol = Math.min(pos1.col, pos2.col);
        const row = pos1.row;
        const wallKey = `${row}-${minCol}`;
        const blocked = window.gameState.verticalWalls.has(wallKey);
        return blocked;
    } else if (pos1.col === pos2.col && Math.abs(pos1.row - pos2.row) === 1) {
        let blocked = false;
        if (pos1.row < pos2.row) {
            blocked = window.gameState.horizontalWalls.has(`${pos1.row}-${pos1.col}`);
        } else {
            blocked = window.gameState.horizontalWalls.has(`${pos2.row}-${pos2.col}`);
        }
        return blocked;
    }
    return false;
}
window.isWallBetween = isWallBetween;

// Calculates valid moves for current player
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
            const jumpPos = { row: oPos.row + dir.r, col: oPos.col + dir.c };
            if (!isWallBetween(oPos, jumpPos) && jumpPos.row >=0 && jumpPos.row < window.BOARD_SIZE && jumpPos.col >= 0 && jumpPos.col < window.BOARD_SIZE) {
                moves.push(jumpPos);
            } else {
                if (dir.r === 0) {
                    const diag1 = {row: oPos.row - 1, col: oPos.col};
                    const diag2 = {row: oPos.row + 1, col: oPos.col};
                    if (!isWallBetween(oPos, diag1) && diag1.row >= 0) moves.push(diag1);
                    if (!isWallBetween(oPos, diag2) && diag2.row < window.BOARD_SIZE) moves.push(diag2);
                } else {
                    const diag1 = {row: oPos.row, col: oPos.col - 1};
                    const diag2 = {row: oPos.row, col: oPos.col + 1};
                    if (!isWallBetween(oPos, diag1) && diag1.col >= 0) moves.push(diag1);
                    if (!isWallBetween(oPos, diag2) && diag2.col < window.BOARD_SIZE) moves.push(diag2);
                }
            }
        } else {
            moves.push(nextPos);
        }
    }
    window.gameState.validMoves = moves.filter(m => m && m.row >= 0 && m.row < window.BOARD_SIZE && m.col >= 0 && m.col < window.BOARD_SIZE);
}
window.calculateValidMoves = calculateValidMoves;

// Checks if player has path to goal
function hasPathToGoal(playerPos, targetRow, tempWalls) {
    if (!playerPos || typeof targetRow !== 'number' || !tempWalls) return false;
    if (playerPos.row === targetRow) return true;
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
            if (current.row === next.row) {
                const minCol = Math.min(current.col, next.col);
                blocked = tempWalls.vertical && tempWalls.vertical.has(`${current.row}-${minCol}`);
            } else {
                const minRow = Math.min(current.row, next.row);
                blocked = tempWalls.horizontal && tempWalls.horizontal.has(`${minRow}-${current.col}`);
            }
            if (!blocked) {
                visited.add(posKey);
                queue.push(next);
            }
        }
    }
    return false;
}

// Validates wall placement
function isValidWallPlacement(first, second) {
    if (window.gameState.wallsRemaining[window.gameState.currentPlayer] <= 0) return false;
    const firstKey = `${first.row}-${first.col}`;
    const secondKey = `${second.row}-${second.col}`;
    const wallSet = first.wallType === 'horizontal' ? window.gameState.horizontalWalls : window.gameState.verticalWalls;
    if (wallSet.has(firstKey) || wallSet.has(secondKey)) return false;
    if (first.wallType === 'horizontal') {
        if (window.gameState.verticalWalls.has(`${first.row}-${first.col}`)) return false;
    } else {
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
    const player1HasPath = hasPathToGoal(window.gameState.player1Position, 0, tempWalls);
    const player2HasPath = hasPathToGoal(window.gameState.player2Position, 8, tempWalls);
    return player1HasPath && player2HasPath;
}
window.isValidWallPlacement = isValidWallPlacement;

// Gets possible second wall segments
function getPossibleSecondSegments(first) {
    const possibilities = [];
    const { wallType, row, col } = first;
    if (wallType === 'horizontal') {
        if (col > 0) possibilities.push({ wallType, row, col: col - 1 });
        if (col < window.BOARD_SIZE - 2) possibilities.push({ wallType, row, col: col + 1 });
    } else {
        if (row > 0) possibilities.push({ wallType, row: row - 1, col });
        if (row < window.BOARD_SIZE - 2) possibilities.push({ wallType, row: row + 1, col });
    }
    return possibilities;
}
window.getPossibleSecondSegments = getPossibleSecondSegments;

// Handles cell click for movement
function handleCellClick(row, col) {
    if (window.gameState.winner || window.gameState.gameMode !== 'move') return;
    if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2) return;
    const currentPos = window.gameState.currentPlayer === 1 ? window.gameState.player1Position : window.gameState.player2Position;
    const isValid = window.gameState.validMoves.some(m => m.row === row && m.col === col);
    if (isValid) {
        const fromPos = { ...currentPos };
        const toPos = { row, col };
        if (window.gameState.currentPlayer === 1) {
            window.gameState.player1Position = { row, col };
        } else {
            window.gameState.player2Position = { row, col };
        }
        animatePlayerMovement(window.gameState.currentPlayer, fromPos, toPos, () => {
            endTurn();
        });
    }
}

// Handles wall placement click
function handleWallClick(wallType, row, col) {
    if (window.gameState.winner || window.gameState.gameMode !== 'wall' || window.gameState.wallsRemaining[window.gameState.currentPlayer] <= 0) return;
    if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2) return;
    const wallKey = `${row}-${col}`;
    const wallSet = wallType === 'horizontal' ? window.gameState.horizontalWalls : window.gameState.verticalWalls;
    if (wallSet.has(wallKey)) return;
    let seg1, seg2;
    if (wallType === 'horizontal') {
        const adjacentKey = `${row}-${col + 1}`;
        if (col + 1 >= window.BOARD_SIZE - 1 || wallSet.has(adjacentKey)) return;
        seg1 = { wallType, row, col };
        seg2 = { wallType, row, col: col + 1 };
    } else {
        const adjacentKey = `${row + 1}-${col}`;
        if (row + 1 >= window.BOARD_SIZE - 1 || wallSet.has(adjacentKey)) return;
        seg1 = { wallType, row, col };
        seg2 = { wallType, row: row + 1, col };
    }
    if (isValidWallPlacement(seg1, seg2)) {
        placeWall(seg1, seg2);
        endTurn();
    }
}

// Places wall in scene
function placeWall(seg1, seg2) {
    const wallSet = seg1.wallType === 'horizontal' ? window.gameState.horizontalWalls : window.gameState.verticalWalls;
    const seg1Key = `${seg1.row}-${seg1.col}`;
    const seg2Key = `${seg2.row}-${seg2.col}`;
    wallSet.add(seg1Key);
    wallSet.add(seg2Key);
    window.gameState.wallsRemaining[window.gameState.currentPlayer]--;
    const minRow = Math.min(seg1.row, seg2.row);
    const minCol = Math.min(seg1.col, seg2.col);
    addWallMesh(seg1.wallType, minRow, minCol);
}
window.placeWall = placeWall;

// Ends current turn
function endTurn() {
    const winner = checkWinner();
    if (winner) {
        window.gameState.winner = winner;
        updateScene();
        updateUI();
        return;
    }
    const previousPlayer = window.gameState.currentPlayer;
    window.gameState.currentPlayer = window.gameState.currentPlayer === 1 ? 2 : 1;
    window.gameState.gameMode = 'move';
    calculateValidMoves();
    updateScene();
    updateUI();
    setTimeout(() => {
        checkAiTurn();
    }, 100);
}
window.endTurn = endTurn;

// Loads player pawn models
async function loadPawns() {
    const loader = new GLTFLoader();
    const smokingUrl = 'https://shaharfullstack.github.io/gltfLoader/smoking.glb';
    const cornUrl = 'https://shaharfullstack.github.io/gltfLoader/corn.glb';
    const [smokingGltf, cornGltf] = await Promise.all([
        loader.loadAsync(smokingUrl),
        loader.loadAsync(cornUrl)
    ]);
    const smokingModel = smokingGltf.scene;
    smokingModel.scale.set(3, 3, 3);
    smokingModel.position.y = window.CUBE_HEIGHT + 1.5;
    smokingModel.rotation.y = Math.PI - Math.PI/4;
    smokingModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.shadowSide = THREE.DoubleSide;
            }
        }
    });
    window.pawns[1] = smokingModel;
    const cornModel = cornGltf.scene;
    cornModel.scale.set(3, 3, 3);
    cornModel.position.y = window.CUBE_HEIGHT + 1.5;
    cornModel.rotation.y = -5*Math.PI/12;
    cornModel.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.shadowSide = THREE.DoubleSide;
            }
        }
    });
    window.pawns[2] = cornModel;
}

// Adds wall mesh to scene
function addWallMesh(wallType, row, col) {
    const wallHeight = window.WALL_HEIGHT;
    const wallThickness = window.WALL_WIDTH;
    let geometry, position;
    if (wallType === 'horizontal') {
        geometry = new THREE.BoxGeometry(window.CELL_SIZE * 2, wallHeight, wallThickness);
        position = {
            x: window.BOARD_OFFSET + col * window.CELL_SIZE + window.CELL_SIZE/2,
            y: wallHeight / 2,
            z: window.BOARD_OFFSET + row * window.CELL_SIZE + window.CELL_SIZE/2
        };
    } else {
        geometry = new THREE.BoxGeometry(wallThickness, wallHeight, window.CELL_SIZE * 2);
        position = {
            x: window.BOARD_OFFSET + col * window.CELL_SIZE + window.CELL_SIZE/2,
            y: wallHeight / 2,
            z: window.BOARD_OFFSET + row * window.CELL_SIZE + window.CELL_SIZE/2
        };
    }
    const wallMesh = new THREE.Mesh(geometry, window.materials.wall);
    wallMesh.position.set(position.x, position.y, position.z);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallMesh.userData = { type: 'wall', wallType, row, col };
    wallMesh.scale.set(0.1, 0.1, 0.1);
    window.wallsGroup.add(wallMesh);
    const animateWallPlacement = () => {
        const targetScale = 1;
        const currentScale = wallMesh.scale.x;
        const speed = 0.08;
        if (currentScale < targetScale) {
            const newScale = Math.min(currentScale + speed, targetScale);
            wallMesh.scale.set(newScale, newScale, newScale);
            requestAnimationFrame(animateWallPlacement);
        }
    };
    animateWallPlacement();
    const originalEmissive = wallMesh.material.emissiveIntensity;
    wallMesh.material.emissiveIntensity = 0.3;
    setTimeout(() => {
        const fadeGlow = () => {
            if (wallMesh.material.emissiveIntensity > originalEmissive) {
                wallMesh.material.emissiveIntensity -= 0.01;
                requestAnimationFrame(fadeGlow);
            }
        };
        fadeGlow();
    }, 200);
}

// Initializes 3D scene
function initScene3D() {
    window.scene = new THREE.Scene();
    window.scene.background = new THREE.Color(0x87CEEB);
    window.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);
    window.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    window.camera.position.set(-10, 5, 15);
    window.renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('c'), 
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
    });
    window.renderer.setSize(window.innerWidth, window.innerHeight);
    window.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    window.renderer.shadowMap.enabled = true;
    window.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    window.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    window.renderer.toneMappingExposure = 1.2;
    window.renderer.outputColorSpace = THREE.SRGBColorSpace;
    window.controls = new OrbitControls(window.camera, window.renderer.domElement);
    window.controls.target.set(0, 2, 0);
    window.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    window.controls.minDistance = 10;
    window.controls.maxDistance = 40;
    window.controls.enableDamping = true;
    window.controls.dampingFactor = 0.05;
    if (MobileControls.isMobileDevice()) {
        window.controls.enablePan = false;
        window.controls.rotateSpeed = 0.5;
        window.controls.zoomSpeed = 0.8;
        window.controls.minDistance = 8;
        window.controls.maxDistance = 30;
        window.controls.enableDamping = true;
        window.controls.dampingFactor = 0.1;
    }
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
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.6);
    window.scene.add(hemiLight);
    const fillLight = new THREE.DirectionalLight(0xaabbcc, 0.8);
    fillLight.position.set(-10, 15, -10);
    window.scene.add(fillLight);
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
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100, 32, 32),
        new THREE.MeshPhysicalMaterial({ 
            color: 0x228B22,
            roughness: 0.8,
            metalness: 0.1,
            emissive: 0x006400,
            emissiveIntensity: 0.05,
            clearcoat: 0.2,
            reflectivity: 0.3
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    window.scene.add(ground);
    const gridHelper = new THREE.GridHelper(100, 50, 0xffffff, 0xcccccc);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    window.scene.add(gridHelper);
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
            cell.rotation.y = (Math.random() - 0.5) * 0.1;
            cell.originalEmissive = cell.material.emissive.getHex();
            cell.originalEmissiveIntensity = cell.material.emissiveIntensity;
            window.boardGroup.add(cell);
            window.cellMeshes.push(cell);
        }
    }
    const wallPlaceholderHeight = window.CUBE_HEIGHT + 0.05;
    const hWallGeo = new THREE.PlaneGeometry(window.CELL_SIZE * 2, window.WALL_WIDTH);
    const vWallGeo = new THREE.PlaneGeometry(window.WALL_WIDTH, window.CELL_SIZE * 2);
    for (let r = 0; r < window.BOARD_SIZE - 1; r++) {
        for (let c = 0; c < window.BOARD_SIZE - 1; c++) {
            const hPlane = new THREE.Mesh(hWallGeo, window.materials.wallPlaceholder);
            hPlane.rotation.x = -Math.PI / 2;
            hPlane.position.set(
                window.BOARD_OFFSET + c * window.CELL_SIZE + window.CELL_SIZE/2, 
                wallPlaceholderHeight, 
                window.BOARD_OFFSET + r * window.CELL_SIZE + window.CELL_SIZE/2
            );
            hPlane.userData = { type: 'h_wall_placeholder', wallType: 'horizontal', row: r, col: c };
            hPlane.visible = false;
            window.boardGroup.add(hPlane);
            window.hWallPlanes.push(hPlane);
            const vPlane = new THREE.Mesh(vWallGeo, window.materials.wallPlaceholder);
            vPlane.rotation.x = -Math.PI / 2;
            vPlane.position.set(
                window.BOARD_OFFSET + c * window.CELL_SIZE + window.CELL_SIZE/2, 
                wallPlaceholderHeight, 
                window.BOARD_OFFSET + r * window.CELL_SIZE + window.CELL_SIZE/2
            );
            vPlane.userData = { type: 'v_wall_placeholder', wallType: 'vertical', row: r, col: c };
            vPlane.visible = false;
            window.boardGroup.add(vPlane);
            window.vWallPlanes.push(vPlane);
        }
    }
    window.raycaster = new THREE.Raycaster();
    window.mouse = new THREE.Vector2();
}

// Resets game to initial state
function resetGame() {
    window.wallsGroup.clear();
    resetGameState();
    updateScene();
    updateUI();
}
window.resetGame = resetGame;

// Handles window resize
function onWindowResize() {
    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    window.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Tracks mouse movement
function onMouseMove(event) {
    window.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    window.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Handles click events
function onClick(event) {
    if (window.gameState.winner) return;
    window.raycaster.setFromCamera(window.mouse, window.camera);
    const boardIntersects = window.raycaster.intersectObjects(window.boardGroup.children, true);
    const wallIntersects = window.raycaster.intersectObjects(window.wallsGroup.children, true);
    const allIntersects = [...boardIntersects, ...wallIntersects].sort((a, b) => a.distance - b.distance);
    if (allIntersects.length > 0) {
        const { userData } = allIntersects[0].object;
        if(userData.type === 'cell') {
            handleCellClick(userData.row, userData.col);
        } else if (userData.type?.includes('wall_placeholder')) {
            handleWallClick(userData.wallType, userData.row, userData.col);
        }
    }
}

// Animates the scene
function animate() {
    requestAnimationFrame(animate);
    const currentTime = Date.now();
    if (currentTime - lastRenderTime < frameInterval) return;
    lastRenderTime = currentTime;
    window.controls.update();
    frameCount++;
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

// Initializes the game
async function initGame() {
    initScene3D();
    await loadPawns();
    window.boardGroup.add(window.pawns[1], window.pawns[2]);
    showGameModeSelection();
    animate();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    document.getElementById('move-btn').addEventListener('click', () => setGameMode('move'));
    document.getElementById('wall-btn').addEventListener('click', () => setGameMode('wall'));
    document.getElementById('reset-btn').addEventListener('click', showGameModeSelection);
    document.getElementById('language-toggle').addEventListener('click', switchLanguage);
    updateAllText();
}

initGame();