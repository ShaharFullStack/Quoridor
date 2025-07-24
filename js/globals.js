// Provide a no-op logTimer to prevent errors in scripts that still reference it
window.logTimer = function(){};
// --- SHARED GLOBALS ---

// Game constants
window.BOARD_SIZE = 9;
window.WALLS_PER_PLAYER = 10;
window.CELL_SIZE = 2;
window.CUBE_HEIGHT = 0.3;
window.CUBE_GAP = 0.1;
window.WALL_WIDTH = 0.2;
window.WALL_HEIGHT = 1.2;
window.BOARD_OFFSET = -((window.BOARD_SIZE - 1) * window.CELL_SIZE) / 2;

// Global game objects
window.scene = null;
window.camera = null;
window.renderer = null;
window.controls = null;
window.raycaster = null;
window.mouse = null;
window.boardGroup = null;
window.pawns = {};
window.wallsGroup = null;
window.cellMeshes = [];
window.hWallPlanes = [];
window.vWallPlanes = [];
window.hoveredObject = null;
window.playerSpotlights = {};
window.materials = {};
window.gameState = {};

// AI and game mode globals
window.aiDifficulty = 'medium'; // easy, medium, hard
window.gameMode = 'pvp'; // pvp (player vs player) or pvc (player vs computer)
window.isAiThinking = false;
