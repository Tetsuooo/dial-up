import Utils from '~/utils';
import fn from 'periodic-function';

class BackgroundPainter {
  constructor(sprite) {
    // Use the full canvas dimensions instead of window dimensions
    // This allows sprites to move off the visible viewport
    const app = window.pixiApp;
    this.canvasWidth = app.renderer.width;
    this.canvasHeight = app.renderer.height;
    
    // Store viewport dimensions for reference
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    
    this.sprite = sprite;

    // Ensure sprite is properly set up for rendering
    this.sprite.visible = true;
    this.sprite.renderable = true;

    // Set alpha to a visible value at start
    this.sprite.alpha = 0.7;
    
    // Keep original texture dimensions instead of scaling to window
    // We don't want to force specific dimensions, let the texture dictate
    // Scale up slightly to ensure good coverage
    const scale = 1.2;
    this.sprite.scale.set(scale);
    
    // Position sprites in center of the canvas (which is offset from viewport)
    // This ensures the sprite can move in/out of the viewport naturally
    this.sprite.x = this.canvasWidth / 2;
    this.sprite.y = this.canvasHeight / 2;
    
    // Random initial position covering the entire canvas area
    const randomOffsetX = (Math.random() - 0.5) * this.canvasWidth * 0.8;
    const randomOffsetY = (Math.random() - 0.5) * this.canvasHeight * 0.8;
    
    this.sprite.x += randomOffsetX;
    this.sprite.y += randomOffsetY;
    this.sprite.anchor.set(0.5); // Keep center anchor

    // Diagnostic logging
    console.log(`BackgroundPainter initialized: Sprite dimensions ${this.sprite.width}x${this.sprite.height}, Position (${this.sprite.x}, ${this.sprite.y}), Alpha: ${this.sprite.alpha}`);

    // Create random movement vector
    const angle = Math.random() * Math.PI * 2;
    
    // Use exact speed specified (0.085) and apply in random direction
    const speed = 0.085;
    
    this.spriteData = {
      xChange: Math.cos(angle) * speed,
      yChange: Math.sin(angle) * speed,
      alpha: Math.random() * 100,
      alphaChange: Math.random() * 0.5 + 0.5 // Ensure positive change
    };

    this.sprite.zIndex = 10; // Match the zIndex from mix.js
    
    // Force update to ensure proper rendering
    this.updateSprite(0);
  }

  updateSprite(delta) {
    // First check if sprite or texture is valid
    if (!this.sprite || !this.sprite.texture) {
      console.warn("Background sprite or texture is null");
      return;
    }
    
    // Allow sprites to move partially off-screen before bouncing
    // We'll use the full canvas boundaries to determine when to bounce
    const spriteWidth = this.sprite.width;
    const spriteHeight = this.sprite.height;
    
    // More relaxed boundary conditions for the larger canvas
    // Let sprites move almost to the edge of the canvas before bouncing
    const margin = Math.max(spriteWidth, spriteHeight) * 0.5; // Half sprite size margin
    
    // Check if sprite would move beyond the canvas boundaries
    if ((this.sprite.x + this.spriteData.xChange * delta > this.canvasWidth - margin) || 
        (this.sprite.x + this.spriteData.xChange * delta < margin)) {
      this.spriteData.xChange = -this.spriteData.xChange;
      console.log("Background changed horizontal direction");
    }
    
    if ((this.sprite.y + this.spriteData.yChange * delta > this.canvasHeight - margin) || 
        (this.sprite.y + this.spriteData.yChange * delta < margin)) {
      this.spriteData.yChange = -this.spriteData.yChange;
      console.log("Background changed vertical direction");
    }

    // Update position - apply movement
    this.sprite.x += this.spriteData.xChange * delta;
    this.sprite.y += this.spriteData.yChange * delta;

    // Update alpha using triangle wave function
    this.spriteData.alpha += delta * 0.01 * this.spriteData.alphaChange;
    
    // Triangle wave function (0 to 1 range)
    const triangleWave = 2 * Math.abs((this.spriteData.alpha % 2) - 1);
    
    // Apply triangle wave with range controlled by * 0.2
    this.sprite.alpha = 0.5 + (triangleWave * 0.2);
    
    // Log position occasionally to debug movement
    if (Math.random() < 0.01) {
      console.log(`Background position: (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)}), velocity: (${this.spriteData.xChange.toFixed(3)}, ${this.spriteData.yChange.toFixed(3)})`);
    }
  }
}

export {
  BackgroundPainter
};
