// --- MOBILE & TOUCH CONTROLS ---

class MobileControls {
    constructor() {
        this.isMobile = this.detectMobile();
        this.touchStartPos = { x: 0, y: 0 };
        this.touchEndPos = { x: 0, y: 0 };
        this.lastTouchPos = { x: 0, y: 0 };
        this.isTouch = false;
        this.lastTapTime = 0;
        this.doubleTapDelay = 300;
        this.setupMobileControls();
        this.setupOrientationHandling();
        this.preventZoom();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    setupMobileControls() {
        if (!this.isMobile) return;

        // Add mobile-specific classes
        document.body.classList.add('mobile');
        
        // Enhanced touch event handling
        const gameContainer = document.getElementById('game-container');
        
        // Prevent default touch behaviors
        gameContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        gameContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        gameContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Add visual feedback for touch interactions
        this.addTouchFeedback();
        
        // Optimize three.js renderer for mobile
        this.optimizeForMobile();
    }

    handleTouchStart(event) {
        this.isTouch = true;
        const touch = event.touches[0];
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        // Update mouse position for three.js raycaster
        if (window.mouse) {
            window.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            window.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        }
        
        // Prevent scrolling and zooming during game interaction
        if (this.isGameAreaTouch(touch)) {
            event.preventDefault();
        }
    }

    handleTouchMove(event) {
        if (!this.isTouch) return;
        
        const touch = event.touches[0];
        
        // Store the latest touch position for accurate end handling
        this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        
        // Update mouse position for three.js raycaster
        if (window.mouse) {
            window.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            window.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        }
        
        // Prevent scrolling during game interaction
        if (this.isGameAreaTouch(touch)) {
            event.preventDefault();
        }
    }

    handleTouchEnd(event) {
        if (!this.isTouch) return;
        
        const touch = event.changedTouches[0];
        this.touchEndPos = { x: touch.clientX, y: touch.clientY };
        
        // Use the most accurate touch position (from touchmove if available)
        const finalTouch = this.lastTouchPos.x !== 0 ? this.lastTouchPos : this.touchEndPos;
        
        // Check if touch was on a UI button
        const element = document.elementFromPoint(finalTouch.x, finalTouch.y);
        const isUIButton = element && (element.closest('.control-btn') || element.closest('button'));
        
        // Check if this was a tap (not a drag)
        const distance = Math.sqrt(
            Math.pow(this.touchEndPos.x - this.touchStartPos.x, 2) +
            Math.pow(this.touchEndPos.y - this.touchStartPos.y, 2)
        );
        
        if (distance < 20) { // It's a tap, not a drag (increased threshold for mobile)
            if (isUIButton) {
                // For UI buttons, let the normal event handling work
                // Don't prevent default to allow normal click events
            } else {
                // Create a synthetic touch object with the most accurate coordinates
                const accurateTouch = {
                    clientX: finalTouch.x,
                    clientY: finalTouch.y
                };
                this.handleTap(accurateTouch);
            }
        }
        
        this.isTouch = false;
        this.lastTouchPos = { x: 0, y: 0 }; // Reset for next touch
        
        // Only prevent default for game area touches, not UI buttons
        if (this.isGameAreaTouch(touch) && !isUIButton) {
            event.preventDefault();
        }
    }

    handleTap(touch) {
        const currentTime = Date.now();
        
        // Check for double tap
        if (currentTime - this.lastTapTime < this.doubleTapDelay) {
            this.handleDoubleTap(touch);
        } else {
            this.handleSingleTap(touch);
        }
        
        this.lastTapTime = currentTime;
    }

    handleSingleTap(touch) {
        // Always trigger a click event at the tap location, just like desktop
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element) {
            const clickEvent = new MouseEvent('click', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(clickEvent);
        }
    }

    handleDoubleTap(touch) {
        // Double tap could toggle between move and wall mode
        if (window.gameState && !window.gameState.winner) {
            if (window.gameMode === 'pvc' && window.gameState.currentPlayer === 2) {
                return; // AI turn, ignore taps
            }
            
            const currentMode = window.gameState.gameMode;
            const newMode = currentMode === 'move' ? 'wall' : 'move';
            
            // Only switch if wall placement is allowed
            if (newMode === 'wall' && window.gameState.wallsRemaining[window.gameState.currentPlayer] > 0) {
                setGameMode(newMode);
                this.showModeChangeNotification(newMode);
            } else if (newMode === 'move') {
                setGameMode(newMode);
                this.showModeChangeNotification(newMode);
            }
        }
    }

    showModeChangeNotification(mode) {
        // Show a brief notification about mode change
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 255, 0.9);
            color: #000;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            font-size: 0.9rem;
        `;
        
        const modeText = mode === 'move' ? '🚶 Move Mode' : '🧱 Wall Mode';
        notification.textContent = modeText;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 1000);
    }

    isGameAreaTouch(touch) {
        const canvas = document.getElementById('c');
        if (!canvas) return false;
        
        const rect = canvas.getBoundingClientRect();
        return (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
        );
    }

    addTouchFeedback() {
        // Add ripple effect for button taps
        const style = document.createElement('style');
        style.textContent = `
            .mobile .control-btn {
                position: relative;
                overflow: hidden;
            }
            
            .mobile .control-btn::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                transform: translate(-50%, -50%);
                transition: width 0.3s, height 0.3s;
                pointer-events: none;
            }
            
            .mobile .control-btn:active::after {
                width: 100px;
                height: 100px;
            }
            
            .mobile .control-btn:active {
                transform: scale(0.95);
                background: linear-gradient(145deg, 
                    rgba(255, 255, 255, 0.15), 
                    rgba(255, 255, 255, 0.08));
            }
        `;
        document.head.appendChild(style);
    }

    setupOrientationHandling() {
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Also handle resize for when orientation changes
        window.addEventListener('resize', () => {
            if (this.isMobile) {
                this.handleOrientationChange();
            }
        });
    }

    handleOrientationChange() {
        // Update Three.js renderer size
        if (window.camera && window.renderer) {
            window.camera.aspect = window.innerWidth / window.innerHeight;
            window.camera.updateProjectionMatrix();
            window.renderer.setSize(window.innerWidth, window.innerHeight);
        }
        
        // Force a UI update
        if (typeof updateUI === 'function') {
            setTimeout(updateUI, 200);
        }
        
        // Adjust camera position for landscape on mobile
        if (this.isMobile && window.camera) {
            const isLandscape = window.innerWidth > window.innerHeight;
            if (isLandscape && window.innerHeight < 500) {
                // Closer camera for landscape mode on small screens
                window.camera.position.set(-8, 4, 12);
            } else {
                // Standard position
                window.camera.position.set(-10, 5, 15);
            }
            
            if (window.controls) {
                window.controls.update();
            }
        }
    }

    optimizeForMobile() {
        // Wait for renderer to be available
        const checkRenderer = () => {
            if (window.renderer) {
                // Reduce pixel ratio for better performance on mobile
                const pixelRatio = Math.min(window.devicePixelRatio, 2);
                window.renderer.setPixelRatio(pixelRatio);
                
                // Reduce shadow map size for better performance
                if (window.renderer.shadowMap) {
                    window.renderer.shadowMap.enabled = true;
                    window.renderer.shadowMap.type = THREE.BasicShadowMap;
                }
            } else {
                setTimeout(checkRenderer, 100);
            }
        };
        
        checkRenderer();
        
        // Reduce particle count on mobile
        if (typeof createStarField === 'function') {
            // Override the star field creation for mobile
            const originalCreateStarField = createStarField;
            createStarField = function() {
                if (this.isMobile) {
                    // Reduce star count for mobile
                    const starsContainer = document.getElementById('stars-container');
                    const numberOfStars = 50; // Reduced from 100
                    
                    for (let i = 0; i < numberOfStars; i++) {
                        const star = document.createElement('div');
                        star.className = 'star';
                        star.style.left = Math.random() * 100 + '%';
                        star.style.top = Math.random() * 100 + '%';
                        star.style.animationDelay = Math.random() * 2 + 's';
                        star.style.animationDuration = (Math.random() * 3 + 1) + 's';
                        starsContainer.appendChild(star);
                    }
                    
                    // Reduce particle count too
                    const numberOfParticles = 10; // Reduced from 20
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
                } else {
                    originalCreateStarField();
                }
            }.bind(this);
        }
    }

    preventZoom() {
        // Prevent zoom on double tap
        document.addEventListener('touchend', (event) => {
            if (event.touches.length === 0) {
                event.preventDefault();
            }
        });
        
        // Prevent pinch zoom
        document.addEventListener('touchmove', (event) => {
            if (event.scale !== 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        // Prevent zoom with keyboard shortcuts on mobile
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '-' || event.key === '0')) {
                event.preventDefault();
            }
        });
    }

    // Public method to check if device is mobile
    static isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }
}

// Initialize mobile controls when DOM is ready

function setupMobileButtonTouchEvents() {
    // Winner overlay buttons
    const winnerMenuBtn = document.getElementById('winner-menu-btn');
    const winnerReplayBtn = document.getElementById('winner-replay-btn');
    if (winnerMenuBtn) {
        winnerMenuBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            winnerMenuBtn.click();
        });
    }
    if (winnerReplayBtn) {
        winnerReplayBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            winnerReplayBtn.click();
        });
    }
    // Menu buttons (reset, language, etc)
    const resetBtn = document.getElementById('reset-btn');
    const langBtn = document.getElementById('language-toggle');
    if (resetBtn) {
        resetBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            resetBtn.click();
        });
    }
    if (langBtn) {
        langBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            langBtn.click();
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileControls = new MobileControls();
        setTimeout(setupMobileButtonTouchEvents, 100);
    });
} else {
    window.mobileControls = new MobileControls();
    setTimeout(setupMobileButtonTouchEvents, 100);
}

// Export for global access
window.MobileControls = MobileControls;

// Script loading complete
window.logTimer('Script js/mobile.js loaded', 'SCRIPT');