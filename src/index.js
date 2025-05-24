/* global SC */

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------
import { 
  Application, Container, Sprite, Text, Texture, Assets,
  extensions, SCALE_MODES, Graphics
} from 'pixi.js';
import * as Menu from './menu.js';
import * as MixCodeFactory from './mix.js';
import AssetData from './assets/asset-data.json';
import MixUrls from './mixurls.json';
import ArtistLinks from './artist-links.json';
import _ from 'lodash';
import Utils from '~/utils';
import DisplayDebug from './display-debug.js';
import LayerDebug from './layer-debug.js';
import LayerInspector from './layer-inspector.js';
import forceShowLayers from './layer-force.js';
import { SplashPainter } from './strategies/painters/splash.js';
import DomUI from './dom-ui.js';

// Initialize Assets with proper base path
await Assets.init({
  basePath: 'http://localhost:3000'
});

// Fallback WebP loader that works reliably
window.loadWebpFallback = async (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log(`WebP fallback loaded: ${url}`);
      const texture = Texture.from(img);
      texture._isWebp = true;
      texture.valid = true;
      resolve(texture);
    };
    
    img.onerror = () => {
      console.error(`Failed to load WebP: ${url}`);
      resolve(null);
    };
    
    img.src = url;
  });
};

// Debug helper for textures and sprites that can be triggered from the console
window.debugTextures = () => {
  console.log("======= TEXTURE DEBUG =======");
  
  // Extract textures and sprites from the stage
  const app = window.pixiApp; // We'll set this later
  if (!app) {
    console.error("PixiJS app not available - run this after app is initialized");
    return;
  }
  
  // Create a simple visual debug overlay
  const debugOverlay = document.createElement('div');
  debugOverlay.style.position = 'fixed';
  debugOverlay.style.top = '10px';
  debugOverlay.style.left = '10px';
  debugOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
  debugOverlay.style.color = 'white';
  debugOverlay.style.padding = '10px';
  debugOverlay.style.fontFamily = 'monospace';
  debugOverlay.style.zIndex = '9999';
  debugOverlay.style.maxHeight = '80vh';
  debugOverlay.style.overflow = 'auto';
  debugOverlay.style.maxWidth = '80vw';
  debugOverlay.style.fontSize = '12px';
  
  const processContainer = (container, path = "app.stage") => {
    if (!container.children) return;
    
    container.children.forEach((child, index) => {
      const childPath = `${path}.children[${index}]`;
      
      if (child instanceof Sprite) {
        const texture = child.texture;
        let textureInfo = "No texture";
        if (texture) {
          textureInfo = `Valid: ${texture.valid}, Width: ${texture.width}, Height: ${texture.height}, ` + 
                       `Source: ${texture.source?.constructor?.name || 'None'}`;
        }
        
        const childInfo = document.createElement('div');
        childInfo.innerHTML = `
          <div style="margin-bottom: 10px; border-bottom: 1px solid #555;">
            <div><b>Path:</b> ${childPath}</div>
            <div><b>Sprite:</b> Visible=${child.visible}, Alpha=${child.alpha.toFixed(2)}, ` +
                `Size=${child.width.toFixed(0)}x${child.height.toFixed(0)}</div>
            <div><b>Position:</b> X=${child.x.toFixed(0)}, Y=${child.y.toFixed(0)}, ZIndex=${child.zIndex}</div>
            <div><b>Texture:</b> ${textureInfo}</div>
            <div><b>Type:</b> ${texture?._isWebp ? 'WebP' : texture?._isGif ? 'GIF' : 'Regular'}</div>
            <button class="debug-highlight" data-path="${childPath}" style="margin-top: 5px;">Highlight</button>
          </div>
        `;
        
        debugOverlay.appendChild(childInfo);
      }
      
      if (child.children && child.children.length) {
        processContainer(child, childPath);
      }
    });
  };
  
  processContainer(app.stage);
  document.body.appendChild(debugOverlay);
  
  // Add highlight functionality
  debugOverlay.querySelectorAll('.debug-highlight').forEach(btn => {
    btn.addEventListener('click', function() {
      const path = this.getAttribute('data-path');
      const parts = path.split('.').slice(1); // Skip "app"
      
      let target = app;
      parts.forEach(part => {
        const match = part.match(/(\w+)\[(\d+)\]/);
        if (match) {
          const prop = match[1];
          const idx = parseInt(match[2]);
          target = target[prop][idx];
        } else {
          target = target[part];
        }
      });
      
      if (target) {
        // Flash the sprite
        const originalAlpha = target.alpha;
        const originalTint = target.tint;
        
        target.alpha = 1;
        target.tint = 0xFF0000; // Red
        
        setTimeout(() => {
          target.alpha = originalAlpha;
          target.tint = originalTint;
        }, 2000);
      }
    });
  });
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close Debug';
  closeBtn.style.marginTop = '10px';
  closeBtn.style.marginBottom = '10px';
  closeBtn.style.padding = '5px 10px';
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(debugOverlay);
  });
  debugOverlay.prepend(closeBtn);
  
  console.log("Visual texture debugger opened. Click Highlight buttons to flash sprites.");
};

// Simplified asset loader that correctly handles both GIFs and static images
const loadAsset = async (url) => {
  try {
    const cleanUrl = url.replace(/\/+/g, '/').replace(/^\//, '');
    console.log('Loading asset:', cleanUrl);
    
    const isGif = cleanUrl.toLowerCase().endsWith('.gif');
    const isWebp = cleanUrl.toLowerCase().endsWith('.webp');
    
    // For GIFs, use specialized handling
    if (isGif) {
      // Create an HTML image element for the GIF
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          console.log(`GIF loaded: ${cleanUrl} (${img.width}x${img.height})`);
          
          // Create texture from image
          const texture = Texture.from(img);
          texture._isGif = true;
          texture.valid = true; // Force texture to be valid
          
          // Keep the original image in the DOM so the GIF can animate
          // This is important! The image needs to stay in the DOM for animation
          const hiddenDiv = document.createElement('div');
          hiddenDiv.style.position = 'fixed';
          hiddenDiv.style.opacity = '0';
          hiddenDiv.style.pointerEvents = 'none';
          hiddenDiv.style.left = '-9999px';
          hiddenDiv.style.top = '-9999px';
          hiddenDiv.appendChild(img);
          document.body.appendChild(hiddenDiv);
          
          // Store references for cleanup
          texture._gifImg = img;
          texture._gifDiv = hiddenDiv;
          
          console.log(`Created GIF texture for ${cleanUrl}`);
          resolve(texture);
        };
        
        img.onerror = () => {
          console.error(`Failed to load GIF: ${cleanUrl}`);
          resolve(null);
        };
        
        img.src = cleanUrl;
      });
    } 
    // For WebP images, use the Assets.load approach which properly handles WebP in PixiJS v8
    else if (isWebp) {
      try {
        // Use Assets.load which properly handles WebP in PixiJS v8
        const texture = await Assets.load(cleanUrl);
        
        if (texture) {
          console.log(`WebP loaded directly via Assets.load: ${cleanUrl}`);
          texture.valid = true;
        } else {
          console.warn(`Failed to load WebP via Assets.load: ${cleanUrl}`);
        }
        
        return texture;
      } catch (err) {
        console.error(`Error loading WebP via Assets.load: ${cleanUrl}`, err);
        return null;
      }
    } else {
      // For other image types, use standard approach
      const texture = await Assets.load(cleanUrl);
      // Force texture to be valid
      if (texture) {
        texture.valid = true; 
        console.log(`Regular texture loaded: ${cleanUrl} (${texture.width}x${texture.height})`);
      }
      return texture;
    }
  } catch (err) {
    console.error('Error loading asset:', url, err);
    return null;
  }
};

const getAssets = async (assetsData, mix, layer) => {
  if (!assetsData[mix]?.[layer]) return [];

  const results = [];
  const assets = assetsData[mix][layer].filter(asset => asset?.filename);

  for (const asset of assets) {
    try {
      const assetPath = `assets/${mix}/${layer}/${encodeURIComponent(asset.filename.trim())}`;
      let texture = await loadAsset(assetPath);
      
      // Try fallback loading method if the texture failed to load
      if (!texture && assetPath.toLowerCase().endsWith('.webp')) {
        console.log(`Attempting fallback WebP loading for: ${assetPath}`);
        texture = await window.loadWebpFallback(assetPath);
      }
      
      if (texture) {
        // Ensure texture is properly marked as valid
        texture.valid = true;
        
        results.push({
          ...asset,
          filename: assetPath,
          texture,
          valid: true
        });
        console.log(`Successfully loaded: ${assetPath}`);
      } else {
        console.warn(`Failed to load texture: ${assetPath}`);
      }
    } catch (err) {
      console.error(`Error processing asset: ${asset.filename}`, err);
    }
  }

  return results;
};

(async () => {
  // ---------------------------------------------------------------------
  // CONFIGURATION CONSTANTS
  // ---------------------------------------------------------------------
  const BASE_ASSET_URL = '';
  const MIX_COUNT = 40;

  // Log PixiJS version - use only the imported Application, not global PIXI
  console.log('PixiJS version:', Application.VERSION || 'unknown');

  // ---------------------------------------------------------------------
  // CREATE PIXI APPLICATION
  // ---------------------------------------------------------------------
  const mainCanvas = document.createElement('canvas');
  const app = new Application();
  
  // Create a canvas that's larger than the viewport to allow off-screen rendering
  // Adding a 50% buffer on each side (effectively making the canvas 2x the viewport size)
  const canvasWidth = window.innerWidth * 2;
  const canvasHeight = window.innerHeight * 2;
  
  await app.init({
    width: canvasWidth,
    height: canvasHeight,
    backgroundAlpha: 0, // Ensures transparency
    canvas: mainCanvas
  });
  
  // We need the canvas to be positioned correctly so elements can move partially off-screen
  // The proper offset is negative - this moves the canvas up and left so the edges extend beyond viewport
  const canvasOffsetX = -canvasWidth / 4; // Move left by 1/4 of canvas width
  const canvasOffsetY = -canvasHeight / 4; // Move up by 1/4 of canvas height
  
  // Make app available globally for debugging
  window.pixiApp = app;
  
  // Configure Assets system for better texture loading
  Assets.setPreferences({
    preferCreateImageBitmap: false, // This helps with some WebP issues
    crossOrigin: 'anonymous'
  });
  
  // Make forceShowLayers available globally for debugging
  window.forceShowLayers = forceShowLayers;

  // UI related variables
  let isInfoButtonInteracted = false;
  // Declare infoButtonInstance to prevent reference errors
  let infoButtonInstance = null;
  
  // Create DOM UI instance
  let domUI = new DomUI();

  // Add keyboard shortcut for toggling debug panel (Ctrl+D)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      LayerDebug.toggle();
    } else if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      LayerInspector.toggle();
    }
  });

  // Use a simpler approach for GIF updates
  app.updateGifSprites = () => {
    const processContainer = (container) => {
      if (!container || !container.children) return;
      
      container.children.forEach(child => {
        // Recursively process children
        if (child.children) {
          processContainer(child);
        }
        
        // Update GIF textures - uses source instead of baseTexture in PixiJS v8
        if (child.texture && child.texture._isGif) {
          // Use source instead of baseTexture in PixiJS v8
          if (child.texture.source) {
            child.texture.source.update();
          }
          child.texture.update();
        }
      });
    };
    
    processContainer(app.stage);
  };
  
  // Call update frequently for smooth animation
  app.ticker.add(app.updateGifSprites);
  
  app.resizeTo = window;
  document.body.appendChild(mainCanvas);

  // Set PixiJS canvas style
  if (app.renderer && app.renderer.view && app.renderer.view.style) {
    const canvasStyle = app.renderer.view.style;
    canvasStyle.position = 'fixed'; // Use fixed instead of absolute for better positioning
    canvasStyle.left = `${canvasOffsetX}px`;
    canvasStyle.top = `${canvasOffsetY}px`;
    // Don't use 100% width/height as that would scale the larger canvas
    canvasStyle.width = `${canvasWidth}px`;
    canvasStyle.height = `${canvasHeight}px`;
    // Use setProperty for z-index to be more explicit
    canvasStyle.setProperty('z-index', '2001', 'important');
    // Ensure overflow is visible
    document.body.style.overflow = 'hidden';
    
    console.log('Applied canvas styles. Canvas dimensions:', canvasWidth, 'x', canvasHeight, 
                'positioned at:', canvasOffsetX, ',', canvasOffsetY);
  } else {
    console.error('ERROR: PixiJS app.renderer.view or app.renderer.view.style is not available. Canvas styles not applied.');
    if (!app.renderer) {
      console.error('Reason: app.renderer is undefined.');
    } else if (!app.renderer.view) {
      console.error('Reason: app.renderer.view is undefined.');
    } else if (!app.renderer.view.style) {
      console.error('Reason: app.renderer.view.style is undefined (app.renderer.view is not a valid DOM element with a style property).');
      console.log('Value of app.renderer.view:', app.renderer.view);
    }
  }

  // Initialize the layer debug panel
  LayerDebug.init();
  
  // Initialize the layer inspector (hidden by default)
  LayerInspector.init();

  // ---------------------------------------------------------------------
  // FULLSCREEN CSS & APP CONFIG
  // ---------------------------------------------------------------------
  document.body.style.overflow = 'hidden';
  document.body.style.padding = '0';
  document.body.style.margin = '0';
  document.body.style.width = '100%';
  document.body.style.height = '100%';

  app.stage.sortableChildren = true;

  // Initialize background container
  let backgroundContainer = new Container();
  backgroundContainer.sortableChildren = true;
  
  // Initialize render containers
  const renderContainers = {
    menu: new Container()
  };

  const constructTextEntry = (textContent) => {
    const text = new Text({
      text: textContent,
      style: {
        fontFamily: 'Arial',
        fontSize: 44,
        fill: 'black',
        fontStretch: 'extra-condensed',
      }
    });
    text.anchor.set(0.5);

    const txtBG = new Sprite(Texture.WHITE);
    txtBG.anchor.set(0.5);
    txtBG.tint = 0xffff1a;
    txtBG.width = text.height * 1.2;  // Increased from 0.8 to 1.2
    txtBG.height = text.height * 1.2; // Increased from 0.8 to 1.2

    const cage = new Container();
    cage.interactive = true;
    cage.buttonMode = true;
    cage.on('pointerover', () => { txtBG.tint = 0xffffff; });
    cage.on('pointerout', () => { txtBG.tint = 0xffff1a; });
    cage.addChild(txtBG, text);
    return cage;
  };

  // Create DOM navigation buttons
  const navButtons = domUI.createNavButtons();
  navButtons.forwardButton.addEventListener('click', () => changeMix(1));
  navButtons.backwardButton.addEventListener('click', () => changeMix(-1));

  // Add variables needed for SoundCloud
  const svgNS = "http://www.w3.org/2000/svg";
  let scPlayer = null;
  let isPlaying = false;

  // Add progress bar
  const createProgressBar = () => {
    const progressBar = document.createElement('div');
    progressBar.style.position = 'fixed';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    progressBar.style.width = '100%';
    progressBar.style.height = '20px';
    progressBar.style.backgroundColor = 'transparent';
    progressBar.style.cursor = 'pointer';
    progressBar.style.zIndex = '1999';

    const progress = document.createElement('div');
    progress.style.width = '0%';
    progress.style.height = '100%';
    progress.style.backgroundColor = 'yellow';
    progressBar.appendChild(progress);

    // Click handler for seeking
    progressBar.addEventListener('click', async (e) => {
      if (!scPlayer) return;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      scPlayer.getDuration((duration) => {
        scPlayer.seekTo(duration * pos);
      });
    });

    // Update progress periodically
    setInterval(() => {
      if (scPlayer && isPlaying) {
        scPlayer.getPosition((position) => {
          scPlayer.getDuration((duration) => {
            const percentage = (position / duration) * 100;
            progress.style.width = `${percentage}%`;
          });
        });
      }
    }, 100);

    return progressBar;
  };

  let progressBar = createProgressBar();
  document.body.appendChild(progressBar);

  // Restore the original play button with correct styling and position
  const createPlaySVG = () => {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.style.position = "fixed";
    svg.style.bottom = "10px";  // Changed from 30px to 20px (10px lower)
    svg.style.left = "10px";    // Changed from 30px to 20px (10px to the left)
    svg.style.width = "225px";  // Keep size the same
    svg.style.height = "225px"; // Keep size the same
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "auto";
    svg.style.zIndex = "2000";
    svg.style.cursor = "pointer";

    // Create play triangle
    const playShape = document.createElementNS(svgNS, "polygon");
    // Adjusted coordinates to stay within viewBox bounds
    playShape.setAttribute("points", "40,40 40,160 140,100");
    playShape.setAttribute("fill", "yellow");
    svg.appendChild(playShape);

    // Add click handler for play/pause toggle
    svg.addEventListener('click', () => {
      const isPlayButton = playShape.getAttribute("points") === "40,40 40,160 140,100";
      if (isPlayButton) {
        // Switch to pause symbol - rectangles moved closer together
        playShape.setAttribute("points", "40,40 75,40 75,160 40,160, 40,40 115,40 150,40 150,160 115,160 115,40");
      } else {
        // Switch back to play triangle
        playShape.setAttribute("points", "40,40 40,160 140,100");
      }
      togglePlay();
    });

    return svg;
  };

  let playPauseSVG = createPlaySVG();
  document.body.appendChild(playPauseSVG);

  const initSoundCloud = () => {
    const iframe = document.createElement('iframe');
    iframe.id = 'sc-widget';
    iframe.allow = 'autoplay';
    iframe.width = '100%';
    iframe.height = '100';
    iframe.zIndex = '2000';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    return iframe;
  };

  const togglePlay = async () => {
    const mixName = window.location.hash.replace('#', '') || 'mix01';
    const embedUrl = MixUrls[mixName];
    if (!embedUrl) {
      console.error('No SoundCloud embed URL found for mix:', mixName);
      return;
    }

    try {
      if (!scPlayer) {
        const iframe = initSoundCloud();
        iframe.src = embedUrl;

        // Wait for iframe to load
        await new Promise(resolve => {
          iframe.onload = resolve;
        });
        
        scPlayer = SC.Widget(iframe);
        await new Promise((resolve) => {
          scPlayer.bind(SC.Widget.Events.READY, () => {
            scPlayer.play();
            resolve();
          });
        });

        // Add finish event listener
        scPlayer.bind(SC.Widget.Events.FINISH, () => {
          isPlaying = false;
          playPauseSVG.querySelector('polygon').setAttribute("points", "40,40 40,160 140,100");
          progressBar.querySelector('div').style.width = '0%';
        });
      } else {
        if (isPlaying) {
          scPlayer.pause();
        } else {
          scPlayer.play();
        }
      }

      // Update button state
      if (isPlaying) {
        playPauseSVG.querySelector('polygon').setAttribute("points", "40,40 40,160 140,100");
      } else {
        playPauseSVG.querySelector('polygon').setAttribute("points", "40,40 75,40 75,160 40,160, 40,40 115,40 150,40 150,160 115,160 115,40");
      }
      isPlaying = !isPlaying;
    } catch (err) {
      console.error('SoundCloud playback error:', err);
      if (scPlayer) {
        scPlayer = null;
      }
      isPlaying = false;
      playPauseSVG.querySelector('polygon').setAttribute("points", "40,40 40,160 140,100");
    }
  };

  // Create a triangle wave function for alpha fading (returns 0-1)
  const triangleWave = (time, period) => {
    const normalized = (time % period) / period;
    return normalized < 0.5 ? normalized * 2 : 2 - (normalized * 2);
  };

  // Initialize animation parameters for layers
  const animationParams = {
    background: {
      speed: 0.085, // Faster movement for background
      alphaPeriod: 15000, // 15 seconds for a complete fade cycle
      alphaMultiplier: 0.2, // Min alpha is 0.2
      active: true,
      sprites: []
    },
    mist: {
      speed: 0.025, // Very slow movement for mist
      alphaPeriod: 20000, // 20 seconds for a complete fade cycle
      alphaMultiplier: 0.1, // Min alpha is 0.1
      active: true,
      sprites: []
    }
  };

  // Ensure sprites are added to animationParams during initialization
  Object.keys(animationParams).forEach(layerName => {
    const params = animationParams[layerName];
    if (params.sprites.length === 0) {
      console.warn(`No sprites found for layer: ${layerName}`);
      // Add placeholder sprites if none exist
      for (let i = 0; i < 2; i++) {
        const sprite = new Sprite(Texture.WHITE);
        sprite.width = window.innerWidth;
        sprite.height = window.innerHeight;
        sprite.alpha = layerName === 'background' ? 0.5 : 0.4;
        sprite.direction = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
        params.sprites.push(sprite);
        app.stage.addChild(sprite);
      }
    }
  });

  // Animation function to be called by the ticker
  const animateLayers = (delta) => {
    const now = Date.now();

    for (const layerName in animationParams) {
      const params = animationParams[layerName];
      if (!params.active || params.sprites.length === 0) continue;

      params.sprites.forEach(sprite => {
        // Move sprite according to its direction and speed
        sprite.x += sprite.direction.x * params.speed * delta;
        sprite.y += sprite.direction.y * params.speed * delta;

        // Bounce off borders - ensure center never leaves the canvas
        const halfWidth = sprite.width / 2;
        const halfHeight = sprite.height / 2;

        if (sprite.x - halfWidth < 0 || sprite.x + halfWidth > window.innerWidth) {
          sprite.direction.x *= -1; // Reverse horizontal direction
          sprite.x = Math.max(halfWidth, Math.min(window.innerWidth - halfWidth, sprite.x));
        }

        if (sprite.y - halfHeight < 0 || sprite.y + halfHeight > window.innerHeight) {
          sprite.direction.y *= -1; // Reverse vertical direction
          sprite.y = Math.max(halfHeight, Math.min(window.innerHeight - halfHeight, sprite.y));
        }

        // Calculate alpha based on triangle wave
        const alphaBase = triangleWave(now, params.alphaPeriod);
        sprite.alpha = params.alphaMultiplier + (alphaBase * (1 - params.alphaMultiplier));
      });
    }
  };
  
  // Add animation to the ticker
  app.ticker.add(animateLayers);

// Ensure sprites are added to animationParams
Object.keys(animationParams).forEach(layerName => {
  const params = animationParams[layerName];
  if (params.sprites.length === 0) {
    console.warn(`No sprites found for layer: ${layerName}`);
  }
});

  const renderPage = async () => {
    console.log('Rendering page...');

    // Clean up old DOM visual layers
    const oldDomLayers = document.querySelectorAll('.dom-visual-layer');
    oldDomLayers.forEach(node => {
      console.log('Removing old DOM layer:', node.dataset.layerType || 'sample_container');
      node.remove();
    });

    // Clean up DOM UI
    domUI.cleanup();
    
    // Create a new DOM UI instance
    domUI = new DomUI();
    
    // Store the isInfoButtonInteracted flag for the new instance
    domUI.isInfoButtonInteracted = false;
    isInfoButtonInteracted = false;

    // Clean up old PixiJS containers and sprites
    if (app.stage.children.includes(backgroundContainer)) {
      backgroundContainer.children.forEach(layerContainer => {
        layerContainer.children.forEach(sprite => {
          // Clean up any GIF DOM elements to prevent memory leaks
          if (sprite.texture && sprite.texture._gifDiv) {
            try {
              document.body.removeChild(sprite.texture._gifDiv);
              console.log('Removed GIF container for cleanup');
            } catch (e) {
              console.warn('Error removing GIF container:', e);
            }
          }
          if (sprite.destroy) sprite.destroy();
        });
      });
      app.stage.removeChild(backgroundContainer);
    }

    // Reset animation tracked sprites
    for (const layerName in animationParams) {
      animationParams[layerName].sprites = [];
    }

    backgroundContainer = new Container();
    backgroundContainer.sortableChildren = true;
    backgroundContainer.visible = true;
    backgroundContainer.renderable = true;
    backgroundContainer.zIndex = 50; // Set a specific zIndex to ensure proper ordering
    app.stage.addChild(backgroundContainer);
    
    // Force render to check if container is visible
    app.renderer.render(app.stage);
    console.log("Added backgroundContainer to stage and forced render");

    const mixName = window.location.hash.replace('#', '') || 'mix01';
    console.log('Current mix:', mixName);
    const links = ArtistLinks[mixName] || {};
    
    app.stage.children
      .filter(child => child.isSocialButton)
      .forEach(button => app.stage.removeChild(button));

    // --- Splash Panel and Social/Info Buttons Setup ---
    try {
      // Correctly get splash asset information from AssetData
      const splashAssetInfo = AssetData[mixName]?.splash?.[0];
      if (!splashAssetInfo || !splashAssetInfo.filename) {
        console.error(`No splash asset filename found in asset-data.json for mix: ${mixName}`);
        throw new Error('Splash asset filename not found.');
      }

      const splashFilename = splashAssetInfo.filename;
      const splashAssetUrl = `assets/${mixName}/splash/${encodeURIComponent(splashFilename.trim())}`;
      console.log('Attempting to load splash asset from asset-data.json:', splashAssetUrl);
      
      let splashTexture = await loadAsset(splashAssetUrl); // Using loadAsset to handle different types
      let splashSprite;

      if (!splashTexture || !splashTexture.valid) {
        console.warn('Initial loadAsset failed for splash texture or texture is invalid:', splashAssetUrl);
        // Attempt explicit fallback if it was a WebP and loadAsset didn't get it initially
        if (splashAssetUrl.toLowerCase().endsWith('.webp')) {
            console.log(`Attempting explicit fallback WebP loading for splash: ${splashAssetUrl}`);
            splashTexture = await window.loadWebpFallback(splashAssetUrl); // Assign to splashTexture
            if (splashTexture && splashTexture.valid) {
                console.log('Splash texture loaded successfully via explicit fallback.');
            } else {
                 console.error('Explicit fallback for splash WebP also failed.');
                 throw new Error('Splash texture failed to load, even with explicit fallback.');
            }
        } else {
            throw new Error('Splash texture failed to load and is not WebP for fallback.');
        }
      } else {
        console.log('Splash texture loaded successfully via loadAsset:', splashAssetUrl);
      }
      
      // Ensure splashSprite is created with the successfully loaded texture
      if (splashTexture && splashTexture.valid) {
          splashSprite = new Sprite(splashTexture);
      } else {
          // This case should ideally be caught by the errors above, but as a safeguard:
          console.error('Splash sprite cannot be created, texture is invalid or null after load attempts.');
          throw new Error('Splash sprite cannot be created due to invalid texture.');
      }
      
      console.log(`Splash sprite created. Width: ${splashSprite.width}, Height: ${splashSprite.height}, Texture Valid: ${splashSprite.texture.valid}`);

      // Scale the splash sprite to 60% of its original size (40% smaller)
      splashSprite.scale.set(0.6);
      console.log(`Splash sprite scaled to 60%. New dimensions: ${splashSprite.width}x${splashSprite.height}`);

      // ---- Create DOM Splash Panel ----
      // Use the already defined splashAssetUrl
      console.log('Creating DOM splash panel with image:', splashAssetUrl);
      
      // Create the DOM splash panel
      domUI.createSplashPanel({
        imageUrl: splashAssetUrl,
        mixName: mixName,
        links: links,
        initiallyOpen: true,
        yOffset: 100
      });
      
      console.log('DOM Splash panel created and added to document.');

      // Initial auto-close timeout is handled in the DOM UI implementation

    } catch (error) {
      console.error(`Failed to load splash asset for ${mixName} or setup splash panel:`, error);
      // Clean up DOM UI elements if there's an error
      domUI.cleanup();
      // Recreate the DOM UI
      const newDomUI = new DomUI();
      domUI = newDomUI;
    }

    // Create DOM Info Button
    const infoButton = domUI.createInfoButton();
    
    // No need for any PixiJS UI elements as we're using DOM UI now
    
    // Info button click handler is implemented in the DOM UI class
    
    // Store flag for keeping track of info button interactions
    domUI.isInfoButtonInteracted = isInfoButtonInteracted;
    
    console.log('DOM Info button created and added to document.');
    // --- End Splash Panel Setup ---

    if (mixName.startsWith('mix')) {
      const PageRenderer = MixCodeFactory.getMixCode(mixName);
      console.log('PageRenderer:', PageRenderer);
      if (!PageRenderer) {
        console.error(`No PageRenderer found for mix: ${mixName}`);
        return;
      }

      try {
        const layers = await PageRenderer.getLayers();
        console.log('Layers:', layers);

        if (!layers || layers.length === 0) {
          console.warn(`No layers found for mix: ${mixName}`);
          return;
        }

        // Update zIndex for mist layer to be above samples
        const layerZIndices = {
          background: 10,
          samples: 25,    // Changed from 20 to 25
          mist: 30,       // Mist is still above samples
          image: 40,
          text: 50
        };

        // Force backgroundContainer zIndex below all its children
        backgroundContainer.zIndex = 5;
        
        // Sort the layers array by zIndex to ensure proper rendering order
        layers.sort((a, b) => {
          const aIndex = layerZIndices[a.name] || a.zIndex || 0;
          const bIndex = layerZIndices[b.name] || b.zIndex || 0;
          return aIndex - bIndex;
        });
        
        // Log the sorted layer order
        console.log("Layers sorted by zIndex:");
        layers.forEach(layer => {
          console.log(`  ${layer.name}: ${layerZIndices[layer.name] || layer.zIndex}`);
        });

        for (const layer of layers) {
          // Update zIndex if we have a predefined one
          if (layerZIndices[layer.name] !== undefined) {
            layer.zIndex = layerZIndices[layer.name];
            console.log(`Setting ${layer.name} layer zIndex to ${layer.zIndex}`);
          }
          
          const container = new Container();
          container.sortableChildren = true;
          container.visible = true;
          container.renderable = true;
          container.alpha = 1;
          container.zIndex = layer.zIndex;
          container.name = layer.name; // Add name for debugging
          console.log(`Creating layer ${layer.name} with zIndex ${layer.zIndex}`);
          
          const files = await getAssets(AssetData, mixName, layer.name);
          if (files && files.length > 0) {
            console.log(`Loaded ${files.length} valid textures for ${layer.name}`);
            files.forEach((file, i) => {
              console.log(`File ${i}: ${file.filename}, texture valid: ${file.texture?.valid}, dimensions: ${file.texture?.width}x${file.texture?.height}`);
            });
            
            // Render the layer
            await layer.renderer.bind(layer)(files, container, app);
            
            // Only add if it has children
            if (container.children.length > 0) {
              backgroundContainer.addChild(container);
              console.log(`Added layer ${layer.name} with ${container.children.length} sprites`);
              
              // Initialize animated layers (background and mist)
              if (layer.name === 'background' || layer.name === 'mist') {
                container.children.forEach(sprite => {
                  sprite.visible = true;
                  sprite.renderable = true;
                  sprite.width = window.innerWidth;
                  sprite.height = window.innerHeight;
                  
                  // Set layer-specific parameters
                  if (layer.name === 'background') {
                    // Background layer gets full opacity base and faster movement
                    sprite.alpha = 0.7; // Higher base opacity
                  } else if (layer.name === 'mist') {
                    // Mist layer gets lower opacity and slower movement
                    sprite.alpha = 0.4; // Lower base opacity
                    // Ensure mist is above samples by setting higher zIndex
                    container.zIndex = layerZIndices.mist; // Force correct zIndex (30)
                  }
                  
                  // Generate random position - keep centerpoint within canvas
                  const randomX = Math.random() * window.innerWidth;
                  const randomY = Math.random() * window.innerHeight;
                  sprite.x = randomX;
                  sprite.y = randomY;
                  
                  // Normalize movement direction vector for consistent speed
                  const angle = Math.random() * Math.PI * 2;
                  const dirX = Math.cos(angle);
                  const dirY = Math.sin(angle);
                  // Normalize to ensure consistent speed
                  const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
                  sprite.direction = {
                    x: dirX / magnitude,
                    y: dirY / magnitude
                  };
                  
                  // Add sprite to animation system with correct layer name
                  animationParams[layer.name].sprites.push(sprite);
                });
                
                // Log the layer zIndex to confirm it's correct
                console.log(`${layer.name} layer zIndex: ${container.zIndex}`);
                
                // Make sure the container's Z-index is properly set in the parent
                backgroundContainer.sortChildren();
              } else {
                // For non-animated layers, ensure sprites are visible
                container.children.forEach(sprite => {
                  sprite.visible = true;
                  sprite.renderable = true;
                });
              }
              
              // Update the display
              app.renderer.render(app.stage);
            } else {
              console.warn(`Layer ${layer.name} has no sprites to display`);
            }
          } else {
            console.warn(`No valid files loaded for layer ${layer.name}`);
          }
            
          app.renderer.render(app.stage);
        }
        
        // Force sort all children to respect Z indices
        backgroundContainer.sortChildren();
        
        // Log the final layer structure to verify ordering
        console.log("Final layer structure after sorting:");
        backgroundContainer.children.forEach(container => {
          console.log(`Layer: ${container.name}, zIndex: ${container.zIndex}`);
        });
      } catch (err) {
        console.error(`Error loading layers for ${mixName}:`, err);
      }
    }

    app.stage.sortChildren();
    renderContainers.menu.zIndex = 1000;
    app.stage.addChild(renderContainers.menu);

    // Add display list analysis for debugging
    setTimeout(() => {
      console.log("Running display list analysis...");
      DisplayDebug.analyzeDisplayList(app);
    }, 1000);
  };

  // Debug function to create visible navigation squares
  function createDebugNavigationSquares() {
    console.log("Creating debug navigation squares");
    
    // Remove any existing debug squares first
    document.querySelectorAll('.debug-nav-square').forEach(el => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Create right (next/forward) square - now positioned higher with more space
    const rightSquare = document.createElement('div');
    rightSquare.className = 'debug-nav-square next';
    rightSquare.innerHTML = '<span style="font-size: 38px; font-weight: 900;">&gt;</span>'; // Even thicker symbol
    rightSquare.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 100px;
      width: 60px;
      height: 60px;
      background-color: yellow;
      color: black;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
    `;
    
    // Create left (prev/backward) square - position unchanged at bottom
    const leftSquare = document.createElement('div');
    leftSquare.className = 'debug-nav-square prev';
    leftSquare.innerHTML = '<span style="font-size: 38px; font-weight: 900;">&lt;</span>'; // Even thicker symbol
    leftSquare.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 60px;
      height: 60px;
      background-color: yellow;
      color: black;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
    `;
    
    // Add click handlers
    leftSquare.addEventListener('click', () => {
      console.log("Debug left square clicked");
      changeMix(-1);
    });
    
    rightSquare.addEventListener('click', () => {
      console.log("Debug right square clicked");
      changeMix(1);
    });
    
    // Add to body
    document.body.appendChild(rightSquare); // Add next button first (on top)
    document.body.appendChild(leftSquare);  // Add prev button second (on bottom)
    
    // Make globally available
    window.debugSquares = {
      left: leftSquare,
      right: rightSquare
    };
    
    return { left: leftSquare, right: rightSquare };
  }

  if (!window.location.hash) {
    window.location.hash = '#mix01';
  }
  renderPage();

  // Add hash change event listener to re-render when URL changes
  window.addEventListener('hashchange', () => {
    console.log('Hash changed, re-rendering page');
    renderPage();
  });

  // INIT: Create the debug squares initially
  createDebugNavigationSquares();
  
  // Set up a mutation observer to ensure our squares are always present
  const bodyObserver = new MutationObserver(() => {
    if (!document.querySelector('.debug-nav-square')) {
      console.log("Debug squares not found, recreating");
      createDebugNavigationSquares();
    }
  });
  
  // Start observing the document body for changes
  bodyObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // Call createDebugNavigationSquares periodically as a safeguard
  setInterval(() => {
    if (!document.querySelector('.debug-nav-square')) {
      console.log("Debug squares disappeared, recreating them");
      createDebugNavigationSquares();
    }
  }, 2000);
  
  // Add direct event listeners to ensure squares exist after hash changes
  window.addEventListener('hashchange', () => {
    console.log('Hash changed, checking for debug squares');
    setTimeout(() => {
      if (!document.querySelector('.debug-nav-square')) {
        console.log("Debug squares not found after hash change, recreating");
        createDebugNavigationSquares();
      }
    }, 500);
  });

  // Debug function to check layer visibility
  window.checkLayerVisibility = () => {
    console.log("======= LAYER VISIBILITY CHECK =======");
    if (!backgroundContainer) {
      console.error("Background container not found");
      return;
    }
    
    console.log(`Background container: visible=${backgroundContainer.visible}, alpha=${backgroundContainer.alpha}, children=${backgroundContainer.children.length}`);
    backgroundContainer.children.forEach((layerContainer, index) => {
      console.log(`Layer ${index}: visible=${layerContainer.visible}, alpha=${layerContainer.alpha}, children=${layerContainer.children.length}`);
      
      layerContainer.children.forEach((sprite, spriteIndex) => {
        console.log(`  Sprite ${spriteIndex}: visible=${sprite.visible}, alpha=${sprite.alpha}, texture valid=${sprite.texture?.valid}`);
      });
    });
  };

  const changeMix = async (difference) => {
    if (scPlayer) {
      await scPlayer.pause();
      scPlayer = null;
      isPlaying = false;
      playPauseSVG.querySelector('polygon').setAttribute("points", "40,40 40,160 140,100");
      progressBar.querySelector('div').style.width = '0%';
    }

    if (window.location.hash !== '') {
      const mixNum = Number(window.location.hash.replace('#mix', ''));
      if ((difference < 0 && mixNum + difference > 0) ||
          (difference > 0 && mixNum + difference <= MIX_COUNT)) {
        const paddedMixNum = `0000${(mixNum + difference)}`.slice(-2);
        window.location.hash = `#mix${paddedMixNum}`;
        // renderPage will be called by hashchange event
      }
    }
  };

  let resizeTimeout;
  window.onresize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
      renderPage();
      
      // Handle resizing of DOM UI elements
      if (domUI) {
        domUI.handleResize();
      }
    }, 250);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      changeMix(-1);
    } else if (e.key === 'ArrowRight') {
      changeMix(1);
    } else if (e.key === 'v') {
      // Add a keyboard shortcut to check layer visibility
      window.checkLayerVisibility();
    }
  });

})();