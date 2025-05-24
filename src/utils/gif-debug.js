/**
 * Utility for debugging GIF animations in PixiJS
 */
class GifDebug {
  static debugMode = false;
  
  /**
   * Enable debug mode to visualize GIF containers and log details
   */
  static enableDebugMode() {
    this.debugMode = true;
    console.log('GIF Debug Mode: Enabled');
    
    // Show all GIF containers
    document.querySelectorAll('div[data-gif-url]').forEach(container => {
      container.style.opacity = '1';
      container.style.visibility = 'visible';
      container.style.zIndex = '9999';
      container.style.border = '2px solid red';
      container.style.background = 'rgba(255,0,0,0.2)';
    });
  }
  
  /**
   * Disable debug mode
   */
  static disableDebugMode() {
    this.debugMode = false;
    console.log('GIF Debug Mode: Disabled');
    
    // Hide all GIF containers
    document.querySelectorAll('div[data-gif-url]').forEach(container => {
      container.style.opacity = '1';
      container.style.visibility = 'hidden';
      container.style.zIndex = '-9999';
      container.style.border = 'none';
      container.style.background = 'transparent';
    });
  }
  
  /**
   * Toggle debug mode
   */
  static toggleDebugMode() {
    if (this.debugMode) {
      this.disableDebugMode();
    } else {
      this.enableDebugMode();
    }
  }
  
  /**
   * Check for issues with GIF textures in the application
   */
  static diagnoseGifIssues(app) {
    console.group('GIF Texture Diagnosis');
    
    // Count of all GIF textures
    let totalGifs = 0;
    let validGifs = 0;
    let invalidGifs = 0;
    let visibleGifs = 0;
    
    const checkContainer = (container, path = 'stage') => {
      container.children.forEach((child, index) => {
        const childPath = `${path}.children[${index}]`;
        
        if (child.texture && child.texture._isAnimatedGif) {
          totalGifs++;
          
          // Check if texture is valid
          const isValid = child.texture.valid === true;
          if (isValid) validGifs++; else invalidGifs++;
          
          // Check if sprite is visible
          const isVisible = child.visible && child.alpha > 0 && child.renderable;
          if (isVisible) visibleGifs++;
          
          console.log(`GIF #${totalGifs} at ${childPath}:`);
          console.log(`  Source: ${child.texture._source || 'unknown'}`);
          console.log(`  Valid: ${isValid}`);
          console.log(`  Visible: ${isVisible} (visible=${child.visible}, alpha=${child.alpha})`);
          console.log(`  Position: (${child.x}, ${child.y})`);
          console.log(`  Size: ${child.width}x${child.height}`);
        }
        
        // Check children recursively
        if (child.children && child.children.length > 0) {
          checkContainer(child, childPath);
        }
      });
    };
    
    // Check all GIFs in the app
    checkContainer(app.stage);
    
    console.log('--- Summary ---');
    console.log(`Total GIFs: ${totalGifs}`);
    console.log(`Valid GIFs: ${validGifs}`);
    console.log(`Invalid GIFs: ${invalidGifs}`);
    console.log(`Visible GIFs: ${visibleGifs}`);
    
    // Check DOM containers
    const containers = document.querySelectorAll('div[data-gif-url]');
    console.log(`GIF DOM containers: ${containers.length}`);
    
    console.groupEnd();
    
    return {
      totalGifs,
      validGifs,
      invalidGifs,
      visibleGifs,
      domContainers: containers.length
    };
  }
}

// Make it available globally for console debugging
window.GifDebug = GifDebug;

export default GifDebug;
