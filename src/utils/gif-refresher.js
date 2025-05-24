/**
 * Helper utility to periodically refresh GIF textures
 * This helps overcome limitations with PixiJS's handling of animated GIFs
 */
class GifRefresher {
  constructor(app) {
    this.app = app;
    this.refreshInterval = 100; // milliseconds
    this.isRunning = false;
    this.lastRefreshTime = 0;
    
    // Bind methods to maintain context
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.refreshGifs = this.refreshGifs.bind(this);
    this.tick = this.tick.bind(this);
  }
  
  /**
   * Start the GIF refresher
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.app.ticker.add(this.tick);
    console.log('GIF refresher started');
  }
  
  /**
   * Stop the GIF refresher
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.app.ticker.remove(this.tick);
    console.log('GIF refresher stopped');
  }
  
  /**
   * Ticker function that periodically refreshes GIFs
   */
  tick(delta) {
    // Only refresh every refreshInterval milliseconds
    const now = Date.now();
    if (now - this.lastRefreshTime < this.refreshInterval) return;
    
    this.lastRefreshTime = now;
    this.refreshGifs();
  }
  
  /**
   * Process the stage and refresh all GIF textures
   */
  refreshGifs() {
    // Process all containers in the stage
    const processContainer = (container) => {
      if (!container || !container.children) return;
      
      container.children.forEach(child => {
        // Process recursively if it's a container
        if (child.children) {
          processContainer(child);
        }
        
        // If it's a sprite with a GIF texture, refresh it
        if (child.texture && child.texture._isGif) {
          // This forces PixiJS to re-sample the texture from its source
          child.texture.update();
        }
      });
    };
    
    // Start with the stage
    processContainer(this.app.stage);
  }
}

export default GifRefresher;
