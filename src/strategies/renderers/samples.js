import _ from 'lodash';

// Bell curve random function for proper image sizing
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

// Fisher-Yates shuffle algorithm for randomizing array
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Create and add sprites for a collection of files
export const samplesLayerRenderer = async (files, container, rootStage) => {
  // Enhanced cleanup of previous DOM container and all related elements
  if (container._domElement) {
    // Stop all intervals first to prevent new images from being added during cleanup
    if (container._intervals) {
      container._intervals.forEach(interval => clearInterval(interval));
      container._intervals = null;
    }
    
    // Remove all sample images from the container
    const existingImages = container._domElement.querySelectorAll('img[data-file-id]');
    existingImages.forEach(img => {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
    });
    
    // Remove the container itself
    if (container._domElement.parentNode) {
      container._domElement.parentNode.removeChild(container._domElement);
    }
    container._domElement = null;
  }
  
  // Clean up any existing active images from previous mix
  if (container._activeImages) {
    container._activeImages.forEach(imageInfo => {
      if (imageInfo.element && imageInfo.element.parentNode) {
        imageInfo.element.parentNode.removeChild(imageInfo.element);
      }
    });
    container._activeImages = null;
  }
  
  // Global cleanup: Remove any orphaned sample images that might be left over
  const orphanedSamples = document.querySelectorAll('img[data-file-id]');
  orphanedSamples.forEach(img => {
    if (img.parentNode) {
      img.parentNode.removeChild(img);
    }
  });
  
  // Also clean up any containers that might have the samples class but no parent container reference
  const orphanedContainers = document.querySelectorAll('.dom-visual-layer');
  orphanedContainers.forEach(containerEl => {
    const hasValidParent = containerEl.dataset.layerType === 'background' || containerEl.dataset.layerType === 'mist';
    if (!hasValidParent) {
      // This might be an orphaned samples container
      const sampleImages = containerEl.querySelectorAll('img[data-file-id]');
      if (sampleImages.length > 0) {
        containerEl.remove();
      }
    }
  });
  
  // Create a container div for our samples
  const samplesContainer = document.createElement('div');
  samplesContainer.classList.add('dom-visual-layer');
  samplesContainer.style.position = 'fixed';
  samplesContainer.style.top = '0';
  samplesContainer.style.left = '0';
  samplesContainer.style.width = '100%';
  samplesContainer.style.height = '100%';
  samplesContainer.style.pointerEvents = 'none';
  samplesContainer.style.zIndex = '25';
  document.body.appendChild(samplesContainer);
  
  // Filter valid files
  const validFiles = files.filter(file => file && file.texture);
  
  // Reduce maximum concurrent images for balanced display
  const maxImages = Math.min(6, Math.max(3, Math.floor(validFiles.length / 2))); // 3-7 images max
  
  // Ensure all files have a unique identifier
  validFiles.forEach((file, index) => {
    file.id = file.id || `file-${index}`;
  });
  
  // Create a randomized sequence of files to display
  let sequenceIndex = 0;
  let fileSequence = shuffleArray([...validFiles]);
  
  // Keep track of files currently displayed to avoid duplicates
  const displayedFileIds = new Set();
  
  // Function to get the next file in sequence (avoiding duplicates)
  const getNextFile = () => {
    if (fileSequence.length === 0) return null;
    
    // If we've used all files in the sequence, shuffle and start again
    if (sequenceIndex >= fileSequence.length) {
      fileSequence = shuffleArray([...validFiles]);
      sequenceIndex = 0;
    }
    
    // Find the next file that's not already displayed
    let startIndex = sequenceIndex;
    let file = null;
    
    do {
      const candidate = fileSequence[sequenceIndex];
      sequenceIndex = (sequenceIndex + 1) % fileSequence.length;
      
      if (!displayedFileIds.has(candidate.id)) {
        file = candidate;
        displayedFileIds.add(candidate.id);
        break;
      }
      
      if (sequenceIndex === startIndex) {
        break;
      }
    } while (file === null);
    
    return file;
  };
  
  // Track active images and their DOM elements
  const activeImages = [];
  
  // Function to add a new image from sequence
  const addNextImage = () => {
    if (activeImages.length >= maxImages || validFiles.length === 0) return;
    
    const file = getNextFile();
    if (!file) return;
    
    try {
      // Create image element with optimized loading
      const img = document.createElement('img');
      img.style.position = 'absolute';
      img.loading = 'lazy'; // Enable lazy loading for performance
      img.decoding = 'async'; // Enable async decoding
      
      // Restore original size range for proper distribution
      const size = randn_bm(150, 9000, 6); // Back to original range: 150-9000px
      
      // Generate random opacity between 0.4 and 0.9 (more visible, less transparent layers)
      const randomOpacity = 0.4 + Math.random() * 0.5;
      img.style.opacity = randomOpacity.toFixed(2);
      
      img.style.width = `${size}px`;
      img.style.height = 'auto';
      
      // Position randomly on screen (avoiding edges)
      const screenPadding = Math.min(100, window.innerWidth * 0.1);
      const maxX = window.innerWidth - screenPadding;
      const maxY = window.innerHeight - screenPadding;
      const randomX = screenPadding + Math.random() * (maxX - 2 * screenPadding);
      const randomY = screenPadding + Math.random() * (maxY - 2 * screenPadding);
      
      img.style.top = `${randomY}px`;
      img.style.left = `${randomX}px`;
      img.style.transform = 'translate(-50%, -50%)';
      img.style.zIndex = '100';
      img.style.pointerEvents = 'all';
      img.style.cursor = 'grab';
      
      // Optimize rendering
      img.style.willChange = 'transform'; // Hint for GPU acceleration
      img.style.backfaceVisibility = 'hidden';
      
      // No styling effects that cause repaints
      img.style.boxShadow = 'none';
      img.style.border = 'none';
      img.style.outline = 'none';
      
      // Force GIF looping by adding a random query parameter to break cache
      let imageSrc = file.filename;
      if (file.filename.toLowerCase().endsWith('.gif')) {
        imageSrc = `${file.filename}?loop=${Date.now()}`;
        img.style.imageRendering = 'pixelated'; // Preserve pixel art quality for GIFs
      }
      
      img.src = imageSrc;
      img.alt = `Sample ${file.id}`;
      img.dataset.fileId = file.id;
      
      // Optimized drag handling with throttling
      let isDragging = false;
      let startX, startY, startLeft, startTop;
      let lastMoveTime = 0;
      
      img.addEventListener('mousedown', (e) => {
        isDragging = true;
        img.style.cursor = 'grabbing';
        img.style.zIndex = '101';
        
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(img.style.left);
        startTop = parseInt(img.style.top);
        
        e.preventDefault();
      });
      
      // Throttled mousemove for better performance
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const now = Date.now();
        if (now - lastMoveTime < 16) return; // Limit to ~60fps
        lastMoveTime = now;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        img.style.left = `${startLeft + dx}px`;
        img.style.top = `${startTop + dy}px`;
      });
      
      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        isDragging = false;
        img.style.cursor = 'grab';
        img.style.zIndex = '100';
      });
      
      // Add to container
      samplesContainer.appendChild(img);
      
      // Track the active image
      activeImages.push({
        element: img,
        timeAdded: Date.now(),
        file: file,
        size: size
      });
      
    } catch (err) {
      console.error(`Error creating optimized sample:`, err);
      if (file) displayedFileIds.delete(file.id);
    }
  };
  
  // Function to remove a random image
  const removeRandomImage = () => {
    if (activeImages.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * activeImages.length);
    const imageInfo = activeImages[randomIndex];
    
    // Remove immediately without fade out
    if (imageInfo.element.parentNode) {
      samplesContainer.removeChild(imageInfo.element);
    }
    
    if (imageInfo.file && imageInfo.file.id) {
      displayedFileIds.delete(imageInfo.file.id);
    }
    
    activeImages.splice(randomIndex, 1);
  };
  
  // Start with only 1 image for immediate display
  if (validFiles.length > 0) {
    addNextImage();
  }
  
  // More balanced intervals
  const addInterval = setInterval(() => {
    if (activeImages.length < maxImages && Math.random() < 0.6) {
      addNextImage();
    }
  }, 5000 + Math.random() * 2000); // 5-7 seconds between additions
  
  const removeInterval = setInterval(() => {
    if (activeImages.length > Math.floor(maxImages / 2) && Math.random() < 0.4) {
      removeRandomImage();
    }
  }, 8000 + Math.random() * 4000); // 8-12 seconds between removals
  
  // Store intervals for cleanup
  container._intervals = [addInterval, removeInterval];
  container._domElement = samplesContainer;
  container._activeImages = activeImages;
  
  // Enhanced cleanup function
  const cleanup = () => {
    // Stop intervals immediately to prevent race conditions
    if (container._intervals) {
      container._intervals.forEach(interval => clearInterval(interval));
      container._intervals = null;
    }
    
    // Remove all active images immediately without fade out
    if (activeImages) {
      activeImages.forEach(imageInfo => {
        if (imageInfo.element && imageInfo.element.parentNode) {
          imageInfo.element.parentNode.removeChild(imageInfo.element);
        }
      });
      // Clear tracking arrays and sets
      activeImages.length = 0;
    }
    
    displayedFileIds.clear();
    
    // Remove container immediately
    if (container._domElement && container._domElement.parentNode) {
      container._domElement.parentNode.removeChild(container._domElement);
      container._domElement = null;
    }
    
    // Final sweep: Remove any remaining sample images globally
    const remainingSamples = document.querySelectorAll('img[data-file-id]');
    remainingSamples.forEach(img => {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
    });
    
    // Clear container references
    container._activeImages = null;
  };
  
  container.cleanup = cleanup;
  
  return container;
};
