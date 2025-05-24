import { Container, Rectangle } from 'pixi.js';

const DEFAULT_PANEL_WIDTH = 600; // Default width if sprite not loaded yet or fails to load

export class SplashPainter {
    constructor(sprite, app, openX = 0) {
        this.sprite = sprite;
        this.app = app; // Pixi Application instance
        this.OPEN_X = openX;
        
        this.container = new Container();
        this.container.addChild(this.sprite);
        
        this.container.x = this._getClosedXPosition();
        this.container.y = 0; 
        this.container.zIndex = 1500; 

        this.targetX = this.container.x;
        this.state = 'CLOSED'; // 'CLOSED', 'OPENING', 'OPEN', 'CLOSING'
        this.animationSpeed = 5000; // Pixels per second (original 500 * 10)

        this.autoCloseTimeoutId = null;
        this.autoCloseScheduled = false;

        // Initial hitArea setup and listener for texture updates
        this._updateHitArea(); 
        if (!this.sprite.texture.valid) {
            this.sprite.texture.once('update', () => {
                this._updateHitArea();
                // If the panel was intended to be closed and its target was based on old width
                if ((this.state === 'CLOSED' || this.state === 'CLOSING') && this.targetX !== this.OPEN_X) {
                    const newClosedX = this._getClosedXPosition();
                    if (this.targetX !== newClosedX) {
                        this.targetX = newClosedX;
                        // If it was static in CLOSED state but now needs to move to a new CLOSED_X
                        if (this.state === 'CLOSED' && this.container.x !== newClosedX) {
                            this.state = 'CLOSING';
                        }
                    }
                }
            });
        }
    }

    _getClosedXPosition() {
        const spriteWidth = (this.sprite && this.sprite.width > 0) ? this.sprite.width : DEFAULT_PANEL_WIDTH;
        return -spriteWidth;
    }

    _updateHitArea() {
        if (this.sprite.texture && this.sprite.texture.valid && this.sprite.width > 0 && this.sprite.height > 0) {
            if (!this.container.hitArea || this.container.hitArea.width !== this.sprite.width || this.container.hitArea.height !== this.sprite.height) {
                this.container.hitArea = new Rectangle(0, 0, this.sprite.width, this.sprite.height);
            }
        } else {
             // Fallback or clear hitArea if sprite is not valid
             this.container.hitArea = null; // Or a default small hitArea if preferred
        }
    }

    openPanel() {
        console.log(`SplashPainter.openPanel called. Current X: ${this.container.x}, Sprite width: ${this.sprite?.width}, Current state: ${this.state}`);
        if (this.state === 'OPEN' && this.container.x === this.OPEN_X) return; // Already open

        this.targetX = this.OPEN_X;
        this.state = 'OPENING';
        this.cancelAutoClose(); 
        console.log(`SplashPainter.openPanel: Set targetX to ${this.OPEN_X}. New state: ${this.state}`);
    }

    closePanel() {
        const currentClosedX = this._getClosedXPosition();
        console.log(`SplashPainter.closePanel called. Current X: ${this.container.x}, Sprite width: ${this.sprite?.width}, Target Closed X: ${currentClosedX}, Current state: ${this.state}`);
        if (this.state === 'CLOSED' && this.container.x === currentClosedX) return; // Already closed

        this.targetX = currentClosedX;
        this.state = 'CLOSING';
        this.cancelAutoClose();
        console.log(`SplashPainter.closePanel: Set targetX to ${this.targetX}. New state: ${this.state}`);
    }

    scheduleAutoClose(delay = 5000) {
        this.cancelAutoClose();
        this.autoCloseScheduled = true;
        console.log(`SplashPainter: Scheduling auto-close in ${delay}ms`);
        this.autoCloseTimeoutId = setTimeout(() => {
            if (this.autoCloseScheduled) {
                console.log('SplashPainter: Auto-closing panel now (scheduled).');
                this.closePanel();
            }
        }, delay);
    }

    cancelAutoClose() {
        if (this.autoCloseTimeoutId) {
            clearTimeout(this.autoCloseTimeoutId);
            this.autoCloseTimeoutId = null;
        }
        if (this.autoCloseScheduled) {
            console.log('SplashPainter: Auto-close cancelled.');
            this.autoCloseScheduled = false;
        }
    }

    update(ticker) { // ticker is the PIXI.Ticker instance
        if (!ticker || typeof ticker.elapsedMS !== 'number') {
            console.warn('SplashPainter.update: Received invalid ticker object or ticker.elapsedMS is not a number. Skipping update.', ticker);
            // Fallback or simply return if ticker is not valid
            // For safety, let's try to use the app's ticker if the passed one is bad and app is available
            if (this.app && this.app.ticker && typeof this.app.ticker.elapsedMS === 'number') {
                console.warn('SplashPainter.update: Using this.app.ticker as a fallback.');
                ticker = this.app.ticker;
            } else {
                return; // Cannot proceed without a valid ticker
            }
        }

        const deltaTimeSeconds = ticker.elapsedMS / 1000.0;
        const currentSpriteWidth = (this.sprite && this.sprite.width > 0) ? this.sprite.width : DEFAULT_PANEL_WIDTH; // For logging
        
        // console.log(`SplashPainter.update TICK: panel.state=${this.state}, panel.x=${this.container.x.toFixed(2)}, panel.targetX=${this.targetX.toFixed(2)}, sprite.width=${currentSpriteWidth}, dtSec=${deltaTimeSeconds.toFixed(4)}`);

        if (isNaN(deltaTimeSeconds) || deltaTimeSeconds <= 0) {
            // console.warn(`SplashPainter.update: Invalid deltaTimeSeconds (${deltaTimeSeconds}). Skipping movement.`);
            this._updateHitArea(); // Still update hit area
            return;
        }

        const moveDistance = this.animationSpeed * deltaTimeSeconds;
        if (isNaN(moveDistance)) {
            console.error('SplashPainter.update: moveDistance is NaN!', { speed: this.animationSpeed, dtS: deltaTimeSeconds });
            this._updateHitArea();
            return;
        }
        // console.log(`SplashPainter.update: moveDistance=${moveDistance.toFixed(2)} for this frame.`);

        const currentClosedX = this._getClosedXPosition();

        if (this.container.x !== this.targetX) {
            let newX = this.container.x;
            if (this.container.x < this.targetX) {
                newX += moveDistance;
                if (newX >= this.targetX) { // Use >= to ensure it reaches target
                    newX = this.targetX;
                }
            } else { // this.container.x > this.targetX
                newX -= moveDistance;
                if (newX <= this.targetX) { // Use <= to ensure it reaches target
                    newX = this.targetX;
                }
            }
            this.container.x = newX;
            // console.log(`SplashPainter.update: Moved container to X=${this.container.x.toFixed(2)} (Target: ${this.targetX.toFixed(2)})`);

            // Update state based on new position
            if (this.container.x === this.OPEN_X) {
                if (this.state !== 'OPEN') {
                    this.state = 'OPEN';
                    console.log('SplashPainter.update: Reached OPEN state.');
                }
            } else if (this.container.x === currentClosedX && this.targetX === currentClosedX) {
                if (this.state !== 'CLOSED') {
                    this.state = 'CLOSED';
                    console.log('SplashPainter.update: Reached CLOSED state.');
                }
            } else if (this.targetX === this.OPEN_X && this.state !== 'OPENING' && this.state !== 'OPEN') {
                 this.state = 'OPENING';
                 // console.log('SplashPainter.update: State changed to OPENING.');
            } else if (this.targetX === currentClosedX && this.state !== 'CLOSING' && this.state !== 'CLOSED') {
                 this.state = 'CLOSING';
                 // console.log('SplashPainter.update: State changed to CLOSING.');
            }

        } else {
            // Container is at target X. Ensure state is correctly set.
            if (this.targetX === this.OPEN_X && this.state !== 'OPEN') {
                this.state = 'OPEN';
                console.log('SplashPainter.update: Confirmed OPEN state (at target).');
            } else if (this.targetX === currentClosedX && this.state !== 'CLOSED') {
                this.state = 'CLOSED';
                console.log('SplashPainter.update: Confirmed CLOSED state (at target).');
            }
            // console.log(`SplashPainter.update: Container at targetX=${this.targetX.toFixed(2)}, state=${this.state}. No movement needed.`);
        }
        this._updateHitArea();
    }

    isFullyOpen() {
        return this.state === 'OPEN' && this.container.x === this.OPEN_X;
    }

    isFullyClosed() {
        return this.state === 'CLOSED' && this.container.x === this._getClosedXPosition();
    }
    
    getContainer() {
        return this.container;
    }

    // Getter for current state, useful for external logic
    getState() {
        return this.state;
    }
}
