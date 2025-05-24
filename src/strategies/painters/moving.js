import Utils from '~/utils';
import { Sprite } from 'pixi.js';

function randn_bm(min, max, skew) {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // translate to 0 -> 1
  if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample if out of range
  num = Math.pow(num, skew); // skew
  num *= max - min; // stretch to fill range
  num += min; // offset to min
  return num;
}

class MovingSpritePainter {
  constructor(sprite) {
    this.surfaceWidth = window.innerWidth;
    this.surfaceHeight = window.innerHeight;
    
    // Additional sprite validation
    if (!sprite) {
      console.error('MovingSpritePainter received null sprite');
      throw new Error('Invalid sprite provided to MovingSpritePainter');
    }

    // Ensure the sprite has valid dimensions
    if (!sprite.width || !sprite.height) {
      console.warn('MovingSpritePainter: sprite has invalid dimensions, setting defaults');
      sprite.width = 200;
      sprite.height = 200;
    }
    
    // Limit maximum size to a reasonable value
    const i = randn_bm(150, 400, 2);
    const ratio = i / Math.max(1, sprite.width);
    
    this.sprite = sprite;
    
    // Make sure sprite is visible
    this.sprite.visible = true;
    this.sprite.renderable = true;
    
    // Use string value 'normal' directly instead of BLEND_MODES.NORMAL
    this.sprite.blendMode = 'normal';  // Use string instead of enum
    this.sprite.alpha = Math.random() * 0.8 + 0.2; // Ensure reasonable alpha (0.2-1.0)
    
    // Set dimensions with constraints
    this.sprite.width = i;
    this.sprite.height = sprite.height * ratio;
    
    // Place sprite within visible bounds
    const padding = 50; // Keep away from edges
    this.sprite.x = padding + Math.random() * (this.surfaceWidth - 2 * padding);
    this.sprite.y = padding + Math.random() * (this.surfaceHeight - 2 * padding);
    this.sprite.anchor.set(0.5);

    // Use faster movement speed for PixiJS v8
    this.spriteData = {
      xChange: Math.random() * Utils.randomDirection() * 0.5,
      yChange: Math.random() * Utils.randomDirection() * 0.5,
      rotationSpeed: Math.random() * 0.002
    };

    // Set up interaction with proper binding for event handlers
    this.sprite.eventMode = 'static'; 
    this.sprite.cursor = 'pointer';    

    // Bind methods to ensure 'this' refers to the MovingSpritePainter instance
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onDragMove = this.onDragMove.bind(this);

    // PixiJS v8-compatible event handling with proper binding
    this.sprite
      .on('pointerdown', this.onDragStart)
      .on('pointerup', this.onDragEnd)
      .on('pointerupoutside', this.onDragEnd)
      .on('pointermove', this.onDragMove);
  }

  onDragStart(event) {
    this.dragging = true;
    this.dragPoint = event.global.clone();
    this.dragStartPosition = { x: this.sprite.x, y: this.sprite.y };
  }

  onDragEnd() {
    this.dragging = false;
  }

  onDragMove(event) {
    if (this.dragging) {
      const newPosition = event.global;
      this.sprite.x = this.dragStartPosition.x + (newPosition.x - this.dragPoint.x);
      this.sprite.y = this.dragStartPosition.y + (newPosition.y - this.dragPoint.y);
    }
  }

  updateSprite(delta) {
    // Check if we have a valid sprite before updating
    if (!this.sprite || !this.sprite.parent) return;

    this.sprite.rotation += delta * this.spriteData.rotationSpeed;

    // Boundary checking
    if (this.sprite.x + delta * this.spriteData.xChange > this.surfaceWidth - this.sprite.width / 2 ||
        this.sprite.x + delta * this.spriteData.xChange < this.sprite.width / 2) {
      this.spriteData.xChange = -this.spriteData.xChange;
    }
    
    if (this.sprite.y + delta * this.spriteData.yChange > this.surfaceHeight - this.sprite.height / 2 ||
        this.sprite.y + delta * this.spriteData.yChange < this.sprite.height / 2) {
      this.spriteData.yChange = -this.spriteData.yChange;
    }

    this.sprite.x += delta * this.spriteData.xChange;
    this.sprite.y += delta * this.spriteData.yChange;
  }
}

export { MovingSpritePainter };
