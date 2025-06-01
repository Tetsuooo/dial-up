/**
 * Performance Manager for optimizing resource usage and preventing memory leaks
 */
class PerformanceManager {
  constructor() {
    this.imageCache = new Map();
    this.maxCacheSize = 50; // Limit cached images
    this.activeDOMElements = new Set();
    this.frameRate = 60;
    this.lastCleanup = Date.now();
    this.cleanupInterval = 30000; // 30 seconds
    
    // Performance monitoring
    this.performanceMetrics = {
      domElementCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.init();
  }
  
  init() {
    // Monitor performance periodically
    setInterval(() => this.performanceCheck(), 5000);
    
    // Cleanup old resources
    setInterval(() => this.cleanup(), this.cleanupInterval);
    
    // Listen for visibility changes to pause/resume
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAnimations();
      } else {
        this.resumeAnimations();
      }
    });
  }
  
  /**
   * Optimized image loading with caching and size limits
   */
  async loadOptimizedImage(url, maxWidth = 1920, maxHeight = 1080) {
    // Check cache first
    if (this.imageCache.has(url)) {
      this.performanceMetrics.cacheHits++;
      return this.imageCache.get(url);
    }
    
    this.performanceMetrics.cacheMisses++;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Check if image needs resizing for performance
        if (img.naturalWidth > maxWidth || img.naturalHeight > maxHeight) {
          const canvas = this.resizeImage(img, maxWidth, maxHeight);
          const resizedImg = new Image();
          resizedImg.onload = () => {
            this.addToCache(url, resizedImg);
            resolve(resizedImg);
          };
          resizedImg.src = canvas.toDataURL('image/webp', 0.8);
        } else {
          this.addToCache(url, img);
          resolve(img);
        }
      };
      
      img.onerror = () => {
        console.error(`Failed to load image: ${url}`);
        reject(new Error(`Image load failed: ${url}`));
      };
      
      img.src = url;
    });
  }
  
  /**
   * Resize image to maximum dimensions while maintaining aspect ratio
   */
  resizeImage(img, maxWidth, maxHeight) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate new dimensions
    const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    canvas.width = img.naturalWidth * ratio;
    canvas.height = img.naturalHeight * ratio;
    
    // Draw resized image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    return canvas;
  }
  
  /**
   * Add image to cache with size management
   */
  addToCache(url, img) {
    // Remove oldest entries if cache is full
    if (this.imageCache.size >= this.maxCacheSize) {
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }
    
    this.imageCache.set(url, img);
  }
  
  /**
   * Track DOM elements for cleanup
   */
  trackDOMElement(element, type = 'unknown') {
    this.activeDOMElements.add({
      element,
      type,
      created: Date.now()
    });
    this.performanceMetrics.domElementCount = this.activeDOMElements.size;
  }
  
  /**
   * Remove DOM element from tracking
   */
  untrackDOMElement(element) {
    for (const tracked of this.activeDOMElements) {
      if (tracked.element === element) {
        this.activeDOMElements.delete(tracked);
        break;
      }
    }
    this.performanceMetrics.domElementCount = this.activeDOMElements.size;
  }
  
  /**
   * Performance monitoring and warnings
   */
  performanceCheck() {
    const memoryInfo = performance.memory || {};
    const domCount = document.querySelectorAll('*').length;
    
    // Warn if too many DOM elements
    if (domCount > 1000) {
      console.warn(`High DOM element count: ${domCount}`);
    }
    
    // Warn if memory usage is high
    if (memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
      console.warn(`High memory usage: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      this.aggressiveCleanup();
    }
    
    console.log('Performance metrics:', {
      domElements: domCount,
      cacheSize: this.imageCache.size,
      cacheHitRate: `${(this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100).toFixed(1)}%`
    });
  }
  
  /**
   * Clean up old resources
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    // Remove old DOM elements that should have been cleaned up
    for (const tracked of this.activeDOMElements) {
      if (now - tracked.created > maxAge && !document.contains(tracked.element)) {
        this.activeDOMElements.delete(tracked);
      }
    }
    
    // Clean up orphaned DOM elements
    const orphanedLayers = document.querySelectorAll('.dom-visual-layer');
    orphanedLayers.forEach(layer => {
      if (!layer.children.length) {
        layer.remove();
      }
    });
  }
  
  /**
   * Aggressive cleanup when memory is high
   */
  aggressiveCleanup() {
    // Clear half the image cache
    const cacheEntries = Array.from(this.imageCache.entries());
    const toRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length / 2));
    toRemove.forEach(([key]) => this.imageCache.delete(key));
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.log('Performed aggressive cleanup');
  }
  
  /**
   * Pause animations when page is hidden
   */
  pauseAnimations() {
    // Find all CSS animations and pause them
    const animatedElements = document.querySelectorAll('*');
    animatedElements.forEach(el => {
      if (el.style.animationPlayState !== undefined) {
        el.style.animationPlayState = 'paused';
      }
    });
  }
  
  /**
   * Resume animations when page is visible
   */
  resumeAnimations() {
    const animatedElements = document.querySelectorAll('*');
    animatedElements.forEach(el => {
      if (el.style.animationPlayState === 'paused') {
        el.style.animationPlayState = 'running';
      }
    });
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.imageCache.size,
      activeDOMElements: this.activeDOMElements.size
    };
  }
  
  /**
   * Clear all cached resources
   */
  clearCache() {
    this.imageCache.clear();
    console.log('Image cache cleared');
  }
}

export default PerformanceManager;
