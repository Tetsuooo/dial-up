class GradientPainter {
  constructor(sprite) {
    this.sprite = sprite;
    this.surfaceWidth = window.innerWidth;
    this.surfaceHeight = window.innerHeight;
    this.spriteData = {};
    
    // Set gradient properties
    this.sprite.width = this.surfaceWidth;
    this.sprite.height = this.surfaceHeight;
    this.sprite.zIndex = 1; // Ensure it stays in background
    this.sprite.alpha = 0.5; // Make it slightly transparent

    // Anchor at top-left and position at (0,0)
    this.sprite.anchor.set(0);
    this.sprite.x = 0;
    this.sprite.y = 0;
  }

  updateSprite(delta) {
    // Static background, no update needed
  }
}

export {
  GradientPainter
};
