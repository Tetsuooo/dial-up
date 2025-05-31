/**
 * DOM-based renderer for background and mist images
 * This uses DOM elements for rendering with specific behaviors:
 * - Maintains exactly 3 elements per layer type (background and mist)
 * - Elements float in and out of view with natural movement
 * - Random opacity transitions with longer pauses at full opacity
 * - Varied blend modes for mist layers
 * - Proper z-ordering without clipping at viewport edges
 */

// Helper function for generating a value from a normal distribution (bell curve)
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

// Get random direction (-1 or 1)
function randomDirection() {
  return Math.random() > 0.5 ? -1 : 1;
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Create a DOM-based renderer for background or mist images
 * @param {String} layerType - 'background' or 'mist'
 * @returns {Function} - The renderer function
 */
export const createDomLayerRenderer = (layerType) => {
  // Return the actual renderer function
  return async (files, container, rootStage) => {
    console.log(`Rendering ${layerType} layer using DOM approach`);
    
    // Remove previous DOM container if it exists
    if (container._domElement) {
      container._domElement.parentNode?.removeChild(container._domElement);
    }
      // Create a container div for our layer
    const layerContainer = document.createElement('div');
    layerContainer.classList.add('dom-visual-layer'); // Add class for cleanup
    layerContainer.style.position = 'fixed';
    layerContainer.style.top = '0';
    layerContainer.style.left = '0';
    layerContainer.style.width = '100%';
    layerContainer.style.height = '100%';
    layerContainer.style.pointerEvents = 'none'; // Let events pass through
    layerContainer.style.overflow = 'visible'; // Crucial: allow content to overflow
    
    // Set z-index based on layer type to match mix.js
    // Make sure DOM layers are always below PixiJS UI (z-index < 2000)
    // New desired order: Mist (20) < Samples (25) < Background (30)
    layerContainer.style.zIndex = layerType === 'background' ? '30' : '20'; // Background: 30, Mist: 20
    console.log(`Setting ${layerType} layer z-index to ${layerContainer.style.zIndex}`);
    
    layerContainer.dataset.layerType = layerType;
    document.body.appendChild(layerContainer);
    console.log(`Added ${layerType} container to DOM`);
    
    // Filter valid files
    const validFiles = files.filter(file => file && file.filename);
    
    if (validFiles.length === 0) {
      console.warn(`No valid ${layerType} files found.`);
      return container;
    }
    
    // Shuffle the files
    const shuffledFiles = shuffleArray(validFiles);
    
    // Track active elements
    const activeElements = [];
    
    // Animation frame IDs for cleanup
    const animationFrames = [];
    
    // Function to add a new layer element
    const addLayerElement = (file) => {
      console.log(`Creating ${layerType} element from file:`, file.filename);
      
      try {        // Create image element
        const img = document.createElement('img');
        img.style.position = 'absolute';
        img.dataset.layerType = layerType;
          // Important - don't constrain the dimensions initially
        // Let the image load at its natural size first
        img.style.width = 'auto';
        img.style.height = 'auto';
        
        // Set initial position in the center of the viewport
        img.style.left = '50%';
        img.style.top = '50%';
        img.style.transform = 'translate(-50%, -50%)'; // Center the image
          // Important to avoid clipping
        layerContainer.style.overflow = 'visible';
          // Set initial transparency - start with very low opacity
        // This prevents the sudden appearance effect
        img.style.opacity = '0';
        
        // Add explicit visibility properties
        img.style.display = 'block';
        img.style.visibility = 'visible';// Set proper blend mode based on layer type
        // For mist layers, use a variety of blend modes for interesting effects
        if (layerType === 'background') {
          img.style.mixBlendMode = 'normal';
        } else {
          // For mist, choose from several blend modes for varied ethereal effects
          const mistBlendModes = ['screen', 'soft-light', 'lighten', 'overlay', 'color-dodge'];
          const randomBlendIndex = Math.floor(Math.random() * mistBlendModes.length);
          img.style.mixBlendMode = mistBlendModes[randomBlendIndex];
        }
        
        // Debug when image fails to load
        img.onerror = () => {
          console.error(`Failed to load ${layerType} image: ${file.filename}`);
        };
          // Make sure the image is loaded before adding animation
        img.onload = () => {
          console.log(`${layerType} image loaded: ${file.filename}, Natural size: ${img.naturalWidth}x${img.naturalHeight}`);
          
          // Now that we know the natural size, we can properly position it
          // Ensure images are at least as large as the viewport (or close to it)
          // while still maintaining their aspect ratio
          
          // Calculate scale needed to make image at least 80% of viewport width/height
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate scale needed to make image approximately viewport sized
          // Use different scaling approaches for background vs mist
          let scaleToWidth, scaleToHeight, scale;
          
          if (layerType === 'background') {
            // Background images should be larger to create depth
            // Scale between 1.2x and 1.4x of what's needed to cover viewport
            scaleToWidth = ((viewportWidth * 1.2) / img.naturalWidth) * (1.0 + Math.random() * 0.2);
            scaleToHeight = ((viewportHeight * 1.2) / img.naturalHeight) * (1.0 + Math.random() * 0.2);
            
            // Use the larger scale to ensure image covers enough of viewport
            scale = Math.max(scaleToWidth, scaleToHeight);
          } else {
            // Mist images can be more varied in size but still large enough
            // Some mist elements will be smaller, some larger
            const sizeVariation = 1.0 + Math.random() * 0.3; // 1.0x to 1.3x
            
            scaleToWidth = (viewportWidth * 1.1) / img.naturalWidth * sizeVariation;
            scaleToHeight = (viewportHeight * 1.1) / img.naturalHeight * sizeVariation;
            
            // For mist, we can use either width or height as the determining factor
            // This creates more variety in the mist elements
            scale = Math.random() > 0.5 ? scaleToWidth : scaleToHeight;
          }
          
          // Never scale down original images that are already large
          scale = Math.max(1.0, scale);
            // Set the image size while preserving aspect ratio
          img.style.width = `${img.naturalWidth * scale}px`;
          img.style.height = `${img.naturalHeight * scale}px`;
          
          // Position randomly within a range that keeps most of the image visible
          // Calculate how far the image can move while keeping a significant portion on screen
          const imgWidth = img.naturalWidth * scale;
          const imgHeight = img.naturalHeight * scale;
          
          // Allow image to be positioned with its center closer to viewport center
          // This ensures better centering while still allowing some movement
          const xRange = viewportWidth * 0.8; // 80% of viewport width
          const yRange = viewportHeight * 0.8; // 80% of viewport height
          
          // Center position is viewport width/2, height/2
          // Random offset is +/- half the range
          // Use normal distribution (bell curve) for some elements to be centered more often
          const useNormalDistribution = Math.random() < 0.7; // 70% chance for better centering
          
          let randomX, randomY;
          if (useNormalDistribution) {
            // Bell curve distribution - more likely to be near center
            randomX = (viewportWidth / 2) + ((randn_bm(-0.5, 0.5, 1) * xRange));
            randomY = (viewportHeight / 2) + ((randn_bm(-0.5, 0.5, 1) * yRange));
          } else {
            // Uniform distribution - anywhere in the range
            randomX = (viewportWidth / 2) + ((Math.random() - 0.5) * xRange);
            randomY = (viewportHeight / 2) + ((Math.random() - 0.5) * yRange);
          }
          
          // Start animation after image is loaded
          let startTime = performance.now();
            // Define animation parameters 
          // Use different speed ranges for background vs mist
          // Background elements move a bit faster than mist for parallax effect
          const baseSpeed = layerType === 'background' ? 0.07 : 0.04;
          const speedVariation = baseSpeed * 0.6; // 60% variation for more natural movement
          
          // Create varied speeds for X and Y directions
          // This creates more natural, less mechanical movement
          const moveSpeedX = baseSpeed + (Math.random() - 0.5) * speedVariation;
          const moveSpeedY = baseSpeed + (Math.random() - 0.5) * speedVariation;
          
          // Random starting direction and position
          let moveDirectionX = randomDirection();
          let moveDirectionY = randomDirection();
          
          // Set initial position after randomizing
          img.style.left = `${randomX}px`;
          img.style.top = `${randomY}px`;
          img.style.transform = 'translate(-50%, -50%)'; // Center using transform
            // Start with random initial movement offset
          let posX = 0;
          let posY = 0;          // Opacity animation - start with a random initial opacity
          // Starting with a non-zero opacity creates a smoother appearance
          const initialOpacity = 0.05 + (Math.random() * 0.15); // Very subtle initial visibility (0.05-0.2)
          let currentOpacity = initialOpacity;
          
          // Direction: true = increasing, false = decreasing
          // Always start increasing from the initial low opacity for new elements
          let opacityDirection = true; // Always start by increasing opacity for new elements
          
          // Opacity change rate (per frame) - use a varied fade rate
          // Slower fade rate for more gradual transitions
          let opacityChangeRate = 0.0004 + (Math.random() * 0.0003); // Between 0.0004-0.0007
          
          console.log(`${layerType} starting with opacity ${initialOpacity.toFixed(2)}, direction: increasing`);
          
          // Set initial opacity
          img.style.opacity = initialOpacity.toString();

          // Create animation frame
          const animate = (timestamp) => {
            const delta = (timestamp - startTime) / 16.67; // Normalize to roughly 60fps
            startTime = timestamp;
            
            // Move the image with different speeds for X and Y
            posX += delta * moveSpeedX * moveDirectionX;
            posY += delta * moveSpeedY * moveDirectionY;
            
            // Apply movement transform while keeping the center point as the reference
            img.style.transform = `translate(calc(-50% + ${posX}px), calc(-50% + ${posY}px))`;
              // Boundary checking - tighter boundaries to keep images more visible
            // Use percentages of image size to determine bounce thresholds
            const bounceThresholdX = layerType === 'background' ? imgWidth * 0.4 : imgWidth * 0.5;
            const bounceThresholdY = layerType === 'background' ? imgHeight * 0.4 : imgHeight * 0.5;
            
            // Add a small random chance to change direction (2% per second)
            // This makes the movement less predictable but still more visible
            const randomDirectionChangeX = Math.random() < (0.02 * delta / 60);
            const randomDirectionChangeY = Math.random() < (0.02 * delta / 60);
            
            if (Math.abs(posX) > bounceThresholdX || randomDirectionChangeX) {
              // If hitting boundary, always reverse
              if (Math.abs(posX) > bounceThresholdX) {
                moveDirectionX *= -1;
              } 
              // Otherwise just flip direction randomly
              else if (randomDirectionChangeX) {
                moveDirectionX *= -1;
              }
            }
            
            if (Math.abs(posY) > bounceThresholdY || randomDirectionChangeY) {
              // If hitting boundary, always reverse
              if (Math.abs(posY) > bounceThresholdY) {
                moveDirectionY *= -1;
              } 
              // Otherwise just flip direction randomly
              else if (randomDirectionChangeY) {
                moveDirectionY *= -1;
              }
            }
            
            // Update opacity based on direction and boundaries
            if (opacityDirection) {
              // Increasing opacity
              currentOpacity += delta * opacityChangeRate;
              
              // If we reach max opacity (0.8-1.0), switch direction but add a longer pause
              // Use a random max opacity between 0.8 and 1.0 for variety
              const maxOpacity = layerType === 'background' ? 1.0 : (0.8 + Math.random() * 0.2);
                if (currentOpacity >= maxOpacity) {
                currentOpacity = maxOpacity;
                opacityDirection = false;
                  // Longer pause at full opacity (5-12 seconds)
                opacityChangeRate = 0.00001; // Extremely slow fade out initially (virtually paused)
                
                // Schedule a reset of the opacity rate after a much longer random delay
                setTimeout(() => {
                  // Only reset if still decreasing and element exists
                  if (!opacityDirection && img.parentNode) {
                    opacityChangeRate = 0.0002 + (Math.random() * 0.0003);
                    console.log(`${layerType} resuming normal fade out`);
                  }
                }, 5000 + Math.random() * 7000); // 5-12 seconds pause
                
                console.log(`${layerType} reached max opacity (${maxOpacity.toFixed(2)}), pausing before decrease`);
              }
            } else {
              // Decreasing opacity
              currentOpacity -= delta * opacityChangeRate;
                // If we reach min opacity (0.0), remove and replace
              if (currentOpacity <= 0.0) {
                currentOpacity = 0.0;
                
                // When opacity becomes 0, add a replacement BEFORE removing this element
                // This ensures we always maintain exactly 3 elements per layer type
                console.log(`${layerType} element faded out, triggering replacement`);
                addReplacementElement();
                
                // Then remove this element from the DOM
                if (img.parentNode) {
                  img.parentNode.removeChild(img);
                  
                  // Also remove from activeElements array
                  const index = activeElements.findIndex(e => e.element === img);
                  if (index !== -1) {
                    activeElements.splice(index, 1);
                  }
                  
                  console.log(`Removed faded ${layerType} element`);
                  
                  // Important: Return early to stop animating this element
                  return;
                }
              }
            }
              // Apply the current opacity
            img.style.opacity = currentOpacity.toString();
            
            // Continue animation if element still exists
            if (img.parentNode) {
              const frameId = requestAnimationFrame(animate);
              animationFrames.push(frameId);
            }
          };
          
          // Start animation with timestamp parameter
          const frameId = requestAnimationFrame(animate);
          animationFrames.push(frameId);
        };
        
        // Set image source - use direct filename for proper path resolution
        img.src = file.filename;
        img.alt = `${layerType} image`;
        
        // Add to container
        layerContainer.appendChild(img);
        console.log(`Added ${layerType} image to container: ${file.filename}`);
        
        // Track the active element
        activeElements.push({
          element: img,
          file: file
        });
        
      } catch (err) {
        console.error(`Error creating ${layerType} DOM element:`, err);
      }    };
    
    // Add each layer image with limited count
    // Limit to exactly 3 elements for both background and mist layers for enhanced depth
    const maxElements = 3; 
    
    // Keep a pool of files for rotation when elements fade out
    const filePool = [...shuffledFiles];
    let activeFileCount = 0;
    
    // Function to add a new element when one fades out    
    const addReplacementElement = () => {
      // Always check current count of elements to maintain exactly 3
      const currentCount = document.querySelectorAll(`img[data-layer-type="${layerType}"]`).length;
      
      // If we already have 3 or more elements, no need to add more
      if (currentCount >= maxElements) {
        console.log(`Already have ${currentCount} ${layerType} elements, skipping replacement`);
        return;
      }
        // Calculate how many elements we need to add to reach exactly 3
      const elementsToAdd = maxElements - currentCount;
      console.log(`Adding ${elementsToAdd} new ${layerType} elements to maintain ${maxElements} total`);
      
      // If we've used most files, reshuffle and start again
      if (filePool.length < elementsToAdd) {
        console.log(`${layerType} file pool running low (${filePool.length}), reshuffling`);
        
        // Create a new shuffled pool from all valid files
        // But exclude currently active files to avoid duplicates
        const activeFileNames = activeElements.map(el => el.file.filename);
        const availableFiles = validFiles.filter(file => !activeFileNames.includes(file.filename));
        
        if (availableFiles.length > 0) {
          filePool.push(...shuffleArray(availableFiles));
          console.log(`Added ${availableFiles.length} files to ${layerType} pool`);
        } else {
          // If all files are currently active, add all files to ensure we have enough
          filePool.push(...shuffleArray(validFiles));
        }
      }
      
      // Add the necessary number of elements, staggered slightly
      for (let i = 0; i < elementsToAdd; i++) {
        // Get next file from pool
        if (filePool.length === 0) {
          console.error(`${layerType} file pool is empty, cannot add new element`);
          return;
        }
        
        const nextFile = filePool.shift();
        
        // Add small staggered delay between multiple elements (if needed)
        setTimeout(() => {
          console.log(`Adding replacement ${layerType} element ${i+1}/${elementsToAdd}`);
          addLayerElement(nextFile);
        }, i * 250); // Small stagger of 250ms between elements
      }
    };    // Initial population of elements with staggered start
    // Always add exactly 3 elements of each type
    for (let i = 0; i < Math.min(maxElements, shuffledFiles.length); i++) {
      // Stagger the initial creation for more natural appearance
      setTimeout(() => {
        if (i < shuffledFiles.length) {
          addLayerElement(shuffledFiles[i]);
          activeFileCount++;
          
          // Remove used files from pool to avoid duplicates initially
          const index = filePool.findIndex(f => f.filename === shuffledFiles[i].filename);
          if (index !== -1) {
            filePool.splice(index, 1);
          }
          
          console.log(`Added initial ${layerType} element ${i+1}/${maxElements}`);
        }
      }, i * 500); // Stagger by 500ms each to ensure distinct appearances
    }
      // Set up cleanup function for later
    const cleanup = () => {
      // Cancel all animation frames
      animationFrames.forEach(frameId => cancelAnimationFrame(frameId));
      
      // Remove the container
      if (layerContainer && layerContainer.parentNode) {
        layerContainer.parentNode.removeChild(layerContainer);
      }
    };
    
    // Attach DOM element and cleanup to container for reference
    container._domElement = layerContainer;
    container.cleanup = cleanup;
    
    // Add a check to make sure the container is visible in the DOM
    setTimeout(() => {
      const layerElement = document.querySelector(`[data-layer-type="${layerType}"]`);
      if (layerElement) {
        const style = window.getComputedStyle(layerElement);
        console.log(`${layerType} container visibility check:`, {
          display: style.display,
          opacity: style.opacity,
          zIndex: style.zIndex,
          childCount: layerElement.children.length
        });
      } else {
        console.error(`${layerType} container not found in DOM!`);
      }
    }, 1000);
    
    return container;
  };
};

// Export specific renderers
export const backgroundLayerRenderer = createDomLayerRenderer('background');
export const mistLayerRenderer = createDomLayerRenderer('mist');
