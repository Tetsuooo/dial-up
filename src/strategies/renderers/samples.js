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
  console.log(`Rendering samples using DOM approach`);
  
  // Remove previous DOM container if it exists
  if (container._domElement) {
    document.body.removeChild(container._domElement);
  }
  
  // Create a container div for our samples
  const samplesContainer = document.createElement('div');
  samplesContainer.classList.add('dom-visual-layer'); // Add class for cleanup
  samplesContainer.style.position = 'fixed';
  samplesContainer.style.top = '0';
  samplesContainer.style.left = '0';
  samplesContainer.style.width = '100%';
  samplesContainer.style.height = '100%';
  samplesContainer.style.pointerEvents = 'none'; // Let events pass through
  samplesContainer.style.zIndex = '25'; // Match the zIndex from mix.js, below UI
  document.body.appendChild(samplesContainer);
  
  // Filter valid files
  const validFiles = files.filter(file => file && file.texture);
  
  // Ensure all files have a unique identifier
  validFiles.forEach((file, index) => {
    file.id = file.id || `file-${index}`;
  });
  
  // Create a randomized sequence of files to display
  let sequenceIndex = 0;
  let fileSequence = shuffleArray([...validFiles]); // Create a copy to shuffle
  
  // Keep track of files currently displayed to avoid duplicates
  const displayedFileIds = new Set();
  
  console.log(`Created initial random sequence of ${fileSequence.length} files`);
  
  // Function to get the next file in sequence (avoiding duplicates)
  const getNextFile = () => {
    if (fileSequence.length === 0) return null;
    
    // If we've used all files in the sequence, shuffle and start again
    if (sequenceIndex >= fileSequence.length) {
      fileSequence = shuffleArray([...validFiles]); // Create new copy
      sequenceIndex = 0;
      console.log(`Reshuffled file sequence`);
    }
    
    // Find the next file that's not already displayed
    let startIndex = sequenceIndex;
    let file = null;
    
    do {
      const candidate = fileSequence[sequenceIndex];
      sequenceIndex = (sequenceIndex + 1) % fileSequence.length;
      
      // If the candidate isn't displayed, use it
      if (!displayedFileIds.has(candidate.id)) {
        file = candidate;
        displayedFileIds.add(candidate.id);
        break;
      }
      
      // If we've checked all files and they're all displayed, break
      if (sequenceIndex === startIndex) {
        console.warn("All files are currently displayed - can't find non-duplicate");
        break;
      }
    } while (file === null);
    
    // If still no file and we have fewer displayed than valid files, 
    // our logic is wrong - just pick a random one not displayed
    if (file === null && displayedFileIds.size < validFiles.length) {
      const notDisplayed = validFiles.find(f => !displayedFileIds.has(f.id));
      if (notDisplayed) {
        file = notDisplayed;
        displayedFileIds.add(notDisplayed.id);
      }
    }
    
    return file;
  };
  
  // Track active images and their DOM elements
  const activeImages = [];
  
  // Function to add a new image from sequence
  const addNextImage = () => {
    if (activeImages.length >= 10 || validFiles.length === 0) return;
    
    // Get next file from sequence
    const file = getNextFile();
    if (!file) return;
    
    try {
      // Create image element
      const img = document.createElement('img');
      img.style.position = 'absolute';
      
      // Scale image using randn_bm function with updated range 150-9000 and skew 7
      const size = randn_bm(150, 9000, 7);
      console.log(`Creating sample with size: ${size.toFixed(0)}px`);
      
      // Generate random opacity between 0.3 and 1.0
      const randomOpacity = 0.3 + Math.random() * 0.7;
      img.style.opacity = randomOpacity.toFixed(2);
      console.log(`Sample opacity: ${randomOpacity.toFixed(2)}`);
      
      img.style.width = `${size}px`;
      img.style.height = 'auto'; // Maintain aspect ratio
      
      // Position randomly on screen (avoiding edges)
      const screenPadding = Math.min(150, window.innerWidth * 0.1);
      const maxX = window.innerWidth - screenPadding;
      const maxY = window.innerHeight - screenPadding;
      const randomX = screenPadding + Math.random() * (maxX - 2 * screenPadding);
      const randomY = screenPadding + Math.random() * (maxY - 2 * screenPadding);
      
      img.style.top = `${randomY}px`;
      img.style.left = `${randomX}px`;
      img.style.transform = 'translate(-50%, -50%)';
      img.style.zIndex = '100';
      img.style.pointerEvents = 'all'; // Make draggable
      img.style.cursor = 'grab';
      
      // No drop shadow or outline
      img.style.boxShadow = 'none';
      img.style.border = 'none';
      img.style.outline = 'none';
      
      // Use the original file URL
      img.src = file.filename;
      img.alt = `Sample ${file.id}`;
      img.dataset.fileId = file.id; // Store the fileId for reference
      
      // Log the actual size of the image for debugging
      img.onload = () => {
        console.log(`Image loaded: ${file.filename} - Specified size: ${size.toFixed(0)}px, Actual size: ${img.offsetWidth}x${img.offsetHeight}`);
      };
      
      // Make draggable with mouse
      let isDragging = false;
      let startX, startY, startLeft, startTop;
      
      img.addEventListener('mousedown', (e) => {
        isDragging = true;
        img.style.cursor = 'grabbing';
        img.style.zIndex = '100';
        
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(img.style.left);
        startTop = parseInt(img.style.top);
        
        // Prevent default drag behavior
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
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
      
      console.log(`Added image ${sequenceIndex}/${fileSequence.length}: ${activeImages.length}/10 active, fileId=${file.id}`);
      
    } catch (err) {
      console.error(`Error creating DOM element for sample:`, err);
      // Remove from displayed set if it failed
      if (file) displayedFileIds.delete(file.id);
    }
  };
  
  // Function to remove a random image
  const removeRandomImage = () => {
    if (activeImages.length === 0) return;
    
    // Pick a random image to remove
    const randomIndex = Math.floor(Math.random() * activeImages.length);
    const imageInfo = activeImages[randomIndex];
    
    // Remove from DOM
    samplesContainer.removeChild(imageInfo.element);
    
    // Remove from tracking set
    if (imageInfo.file && imageInfo.file.id) {
      displayedFileIds.delete(imageInfo.file.id);
    }
    
    // Remove from tracking array
    activeImages.splice(randomIndex, 1);
    
    console.log(`Removed image: ${activeImages.length}/10 active`);
  };
  
  // Initial population - start with exactly ONE image instead of 5
  if (validFiles.length > 0) {
    addNextImage();
    console.log("Started with 1 initial sample");
  }
  
  // Set up asynchronous appearance/disappearance intervals
  // Add images gradually with a longer interval (4-6 seconds)
  const addInterval = setInterval(() => {
    if (activeImages.length < 10 && Math.random() < 0.8) { // Higher probability to add
      addNextImage();
      console.log(`Added new sample. Now displaying ${activeImages.length} samples`);
    }
  }, 4000 + Math.random() * 2000); // Random interval between 4-6 seconds
  
  // Remove images with a different interval, but only when we have 5+ images
  const removeInterval = setInterval(() => {
    // Only start removing when we have more than 5 images (changed from 7)
    if (activeImages.length > 5 && Math.random() < 0.3) {
      removeRandomImage();
      console.log(`Removed a sample. Now displaying ${activeImages.length} samples`);
    }
  }, 5000 + Math.random() * 3000); // Slightly longer interval for removals
  
  // Store intervals for cleanup
  container._intervals = [addInterval, removeInterval];
  
  // Store reference to DOM container for cleanup
  container._domElement = samplesContainer;
  container._activeImages = activeImages;
  
  // Clean up on page change or unload
  const cleanup = () => {
    if (container._intervals) {
      container._intervals.forEach(interval => clearInterval(interval));
      container._intervals = null;
    }
    if (container._domElement && container._domElement.parentNode) {
      container._domElement.parentNode.removeChild(container._domElement);
      container._domElement = null;
    }
    container._activeImages = [];
    displayedFileIds.clear(); // Clear the set of displayed file IDs
  };
  
  // Attach cleanup method to container
  container.cleanup = cleanup;
  
  // Return the container as expected by the caller
  return container;
};
