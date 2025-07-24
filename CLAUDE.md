# Quoridor 3D - Claude Development Guide

## Project Overview
A 3D browser-based implementation of the classic Quoridor board game built with Three.js. Features animated pawns with smoking effects, smooth wall placement, post-processing bloom effects, and multi-language support (English/Hebrew).

## Architecture

### Core Files
- `index.html` - Main entry point with game container and UI elements
- `styles.css` - UI styling and animations
- `js/game.js` - Main game logic, 3D rendering, and Three.js setup
- `js/ai.js` - AI opponent logic and pathfinding
- `js/ui.js` - UI interactions and modal handling
- `js/mobile.js` - Mobile-specific touch controls
- `js/language.js` - Multi-language support system
- `js/globals.js` - Global variables and shared state

### Key Technologies
- **Three.js** - 3D rendering engine
- **Post-processing** - Bloom effects via EffectComposer
- **WebGL** - Hardware-accelerated 3D graphics
- **Responsive Design** - Mobile and desktop support

## Development Commands

### Testing
```bash
# No build system - open directly in browser
python -m http.server 8000  # For local development server
```

### Deployment
```bash
# Static files - can be deployed to any web server
# No build process required
```

## Code Structure

### Game Logic (`js/game.js:1-100`)
- Three.js scene setup with camera, lighting, and post-processing
- Materials system with PBR textures for realistic rendering
- Smoke animation system for character effects
- Frame rate optimization with target 60 FPS

### AI System (`js/ai.js`)
- Minimax algorithm for AI decision making
- Pathfinding validation for wall placement
- Difficulty scaling based on search depth

### UI System (`js/ui.js`)
- Modal dialogs for game states
- Button interactions and animations
- Language switching functionality

## Asset Management

### Textures (`assets/textures/`)
- **stone-tile4b_bl/** - Board surface materials (basecolor, normal, AO, roughness)
- **darktiles1-bl/** - Alternative board textures
- **black-white-tile-bl/** - Checkered pattern materials
- PBR workflow with albedo, normal, metallic, roughness maps

### 3D Models
- Custom sculpted character models by Ram Shay (Israeli artist)
- Smoking animations for characters
- Optimized for web performance

## Development Guidelines

### Performance Optimization
- Frame rate targeting at 60 FPS with adaptive rendering
- Texture compression and LOD management
- Selective bloom effects to reduce GPU load
- Mobile-optimized rendering pipeline

### Code Conventions
- ES6 modules with Three.js imports
- Global variables prefixed with `window.` for cross-file access
- Material definitions centralized in `window.materials`
- Consistent naming for 3D objects and animations

### Multi-language Support
- Text content stored in `js/language.js`
- Hebrew RTL support in CSS
- Dynamic language switching without page reload

## Common Tasks

### Adding New Textures
1. Place texture files in `assets/textures/[texture-name]/`
2. Update material definitions in `js/game.js:26-60`
3. Ensure proper UV mapping and repeat settings

### Modifying AI Behavior
1. Edit search depth in `js/ai.js` for difficulty
2. Adjust evaluation functions for different strategies
3. Update pathfinding algorithms for wall validation

### UI Changes
1. Update HTML structure in `index.html`
2. Modify styles in `styles.css`
3. Add interaction handlers in `js/ui.js`
4. Update language files for text content

## Browser Compatibility
- Modern browsers with WebGL support
- Mobile Safari and Chrome optimized
- Progressive enhancement for older browsers

## Known Issues
- Desktop.ini files in texture folders (Windows metadata)
- Performance may vary on older mobile devices
- WebGL context loss handling needs improvement

## Deployment Notes
- No server-side requirements
- Can be served from any static file host
- HTTPS required for some WebGL features
- Texture loading may require CORS headers for some CDNs

## WHATEVER YOU DO, NEVER, BUT NEVER!
- Declare problem as fixed unless user test and approve
- Try to fix a problem without understanting the entire proccess of the main issue