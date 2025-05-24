/**
 * DOM UI Components for Dial-Up
 * 
 * This file implements DOM-based UI elements that will always appear
 * on top of the canvas, regardless of z-index values in the PixiJS scene.
 */

class DomUI {
  constructor() {
    // Create container for UI elements
    this.container = document.createElement('div');
    this.container.className = 'dom-ui-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none'; // Let clicks pass through by default
    this.container.style.zIndex = '1000'; // High z-index to stay above canvas
    
    // Components
    this.splashPanel = null;
    this.infoButton = null;
    this.navButtons = {
      forward: null,
      backward: null
    };
    
    // State
    this.isInfoButtonInteracted = false;
    this.autoCloseTimeoutId = null;
    this.splashPanelHoverCloseTimeoutId = null;
    
    document.body.appendChild(this.container);
    console.log('DOM UI container created and added to the document body');
    
    // Add resize event listener
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Creates the splash panel with social buttons
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} - The created splash panel element
   */
  createSplashPanel(options = {}) {
    const {
      imageUrl,
      mixName = 'mix01',
      links = {},
      initiallyOpen = true,
      yOffset = 100
    } = options;    // Create splash panel container
    const splashPanel = document.createElement('div');
    splashPanel.className = 'dom-splash-panel';
    splashPanel.style.position = 'absolute';
    splashPanel.style.top = `${yOffset}px`;
    splashPanel.style.left = '0';
    splashPanel.style.pointerEvents = 'none'; // Make the splash panel non-interactive
    splashPanel.style.transition = 'transform 0.5s ease-in-out';
    splashPanel.style.zIndex = '10';
    
    // Create splash image
    const splashImage = document.createElement('img');
    splashImage.src = imageUrl;
    splashImage.alt = `${mixName} splash image`;
    splashImage.style.width = 'auto';
    splashImage.style.maxWidth = '100%';
    splashImage.style.height = 'auto';
    splashImage.style.display = 'block';
    splashImage.style.pointerEvents = 'none'; // Make sure image doesn't capture clicks
    
    // Scale to 60% like in the original code
    splashImage.onload = () => {
      const originalWidth = splashImage.width;
      const scaledWidth = originalWidth * 0.6;
      splashImage.style.width = `${scaledWidth}px`;
      
      // Initially position splash panel off-screen
      if (!initiallyOpen) {
        splashPanel.style.transform = `translateX(-${scaledWidth}px)`;
      }
      
      // Reposition social buttons based on the loaded image dimensions
      if (Object.keys(links).length > 0) {
        const buttonContainer = splashPanel.querySelector('.social-buttons-container');
        if (buttonContainer) {
          const buttons = buttonContainer.querySelectorAll('.social-button');
          buttons.forEach(button => {
            // Reposition buttons now that we know the image dimensions
            this.repositionSocialButton(button, splashImage);
          });
        }
      }
      
      console.log(`DOM Splash panel created. Original width: ${originalWidth}, Scaled width: ${scaledWidth}`);
    };
    
    splashPanel.appendChild(splashImage);
    
    // Add social buttons if needed
    if (Object.keys(links).length > 0) {      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'social-buttons-container';
      buttonContainer.style.position = 'absolute';
      buttonContainer.style.top = '0';
      buttonContainer.style.left = '0';
      buttonContainer.style.width = '100%';
      buttonContainer.style.height = '100%';
      buttonContainer.style.pointerEvents = 'auto'; // Allow button container to capture clicks
      
      // Calculate position for first button (similar to original)
      const firstButtonAbsoluteY = (1.1 / 7) * window.innerHeight;
      const firstButtonRelativeY = firstButtonAbsoluteY - yOffset;
      
      // Add social buttons
      let buttonY = firstButtonRelativeY;
      const socialButtonVerticalSpacing = 40;
      
      // We'll add the social buttons dynamically based on the links object
      this.addSocialButtons(buttonContainer, links, buttonY, socialButtonVerticalSpacing);
      
      splashPanel.appendChild(buttonContainer);
    }
    
    // Set up event listeners for splash panel hover
    splashPanel.addEventListener('mouseenter', () => {
      if (this.isInfoButtonInteracted) {
        console.log('Hover over DOM splash panel, cancelling auto-close.');
        clearTimeout(this.splashPanelHoverCloseTimeoutId);
      }
    });
    
    splashPanel.addEventListener('mouseleave', () => {
      if (this.isInfoButtonInteracted && this.isSplashPanelOpen()) {
        console.log('Hover out from DOM splash panel, scheduling auto-close.');
        clearTimeout(this.splashPanelHoverCloseTimeoutId);
        this.splashPanelHoverCloseTimeoutId = setTimeout(() => {
          if (this.isInfoButtonInteracted) {
            console.log('Auto-closing DOM splash panel due to hover out.');
            this.closeSplashPanel();
          }
        }, 5000);
      }
    });
    
    this.container.appendChild(splashPanel);
    this.splashPanel = splashPanel;
    
    // Set initial auto-close timeout
    if (initiallyOpen) {
      this.autoCloseTimeoutId = setTimeout(() => {
        if (!this.isInfoButtonInteracted) {
          console.log('Initial auto-closing DOM splash panel.');
          this.closeSplashPanel();
        }
      }, 10000);
    }
    
    return splashPanel;
  }
  
  /**
   * Adds social buttons to the button container
   * @param {HTMLElement} container - Container for the buttons
   * @param {Object} links - Links data
   * @param {Number} startY - Starting Y position (used as a fallback)
   * @param {Number} spacing - Vertical spacing between buttons (used as a fallback)
   */
  addSocialButtons(container, links, startY, spacing) {
    // Store these values as percentages of the splash image
    const buttonXPercent = {
      sc: 0.26, // SC button at 50% of splash width (moved left from 75%)
      bc: 0.3  // BC button at 60% of splash width (moved left from 85%)
    };
    
    const buttonYPercent = 0.326; // Both buttons at 15% of splash height
    
    if (links.soundcloud) {
      const scButton = this.createSocialButton(container, 'sc', links.soundcloud, startY, 0);
      scButton.dataset.xPercent = buttonXPercent.sc;
      scButton.dataset.yPercent = buttonYPercent;
    }
    
    if (links.bandcamp) {
      const bcButton = this.createSocialButton(container, 'bc', links.bandcamp, startY, 0);
      bcButton.dataset.xPercent = buttonXPercent.bc;
      bcButton.dataset.yPercent = buttonYPercent;
    }
    
    console.log('Social buttons added to DOM splash panel with relative positioning');
  }
  
  /**
   * Creates a social button
   * @param {HTMLElement} container - Container for the button
   * @param {String} text - Button text
   * @param {String} link - URL to open when clicked
   * @param {Number} y - Y position (fallback)
   * @param {Number} x - X position (fallback)
   * @returns {HTMLElement} - Created button
   */
  createSocialButton(container, text, link, y, x) {
    // Create button container
    const button = document.createElement('button');
    button.className = 'social-button';
    button.dataset.type = text; // Store the button type for later reference
      // Style as yellow square with flexbox centering
    button.style.position = 'absolute';
    button.style.border = 'none';
    button.style.background = '#ffff1a'; // Yellow background
    button.style.color = 'black'; // Black text
    button.style.cursor = 'pointer';
    button.style.padding = '0'; 
    button.style.width = '3.5%'; // Even smaller squares
    button.style.height = '0'; 
    button.style.paddingBottom = '3.5%'; // Keep it square
    button.style.pointerEvents = 'auto'; // Ensure button captures clicks
    
    // Use a div for text to enable full control of the text's appearance
    const textSpan = document.createElement('span');
    textSpan.textContent = text.toLowerCase();
    textSpan.style.display = 'block';
    textSpan.style.fontFamily = 'Arial, sans-serif';
    textSpan.style.fontWeight = '400'; // Thinner font weight
    textSpan.style.transform = 'scaleY(2)'; // Vertically elongate the text 200%
    textSpan.style.transformOrigin = 'center center';
    textSpan.style.position = 'absolute';
    textSpan.style.top = '50%';
    textSpan.style.left = '50%';
    textSpan.style.transform = 'translate(-50%, -50%) scaleY(2)'; // Center and elongate
    textSpan.style.width = '100%';
    textSpan.style.textAlign = 'center';
    
    // Add the text span to the button
    button.appendChild(textSpan);
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.background = '#ffffff'; // White on hover
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = '#ffff1a'; // Back to yellow on mouse out
    });
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(link, '_blank');
    });
    
    container.appendChild(button);
    return button;
  }
  
  /**
   * Repositions a social button based on the splash image dimensions
   * @param {HTMLElement} button - The button to reposition
   * @param {HTMLElement} splashImage - The splash image element
   */
  repositionSocialButton(button, splashImage) {
    // Get the percentage position values from the button's dataset
    const xPercent = parseFloat(button.dataset.xPercent || 0.75);
    const yPercent = parseFloat(button.dataset.yPercent || 0.15);
    
    // Calculate actual pixel positions based on the scaled image dimensions
    const scaledWidth = splashImage.offsetWidth;
    const scaledHeight = splashImage.offsetHeight;
    
    // Position the button relative to the splash image dimensions
    const xPos = scaledWidth * xPercent;
    const yPos = scaledHeight * yPercent;
    
    button.style.left = `${xPos}px`;
    button.style.top = `${yPos}px`;
    button.style.transform = `translate(-50%, -50%)`; // Center the button itself
    
    // Scale font size relative to the splash image width
    const fontSizePercent = 0.016; // Even smaller font size
    const fontSize = Math.max(8, Math.round(scaledWidth * fontSizePercent)); // Minimum 8px
    
    // Apply font size to the text span inside button
    const textSpan = button.querySelector('span');
    if (textSpan) {
      textSpan.style.fontSize = `${fontSize}px`;
      textSpan.style.lineHeight = '1';
      
      // Ensure text is perfectly centered and vertically elongated
      textSpan.style.transform = 'translate(-50%, -50%) scaleY(2)';
      textSpan.style.width = '100%';
      textSpan.style.height = '100%';
      textSpan.style.display = 'flex';
      textSpan.style.alignItems = 'center';
      textSpan.style.justifyContent = 'center';
    }
    
    console.log(`Repositioned ${button.dataset.type} button to x=${xPos}px, y=${yPos}px, fontSize=${fontSize}px`);
  }
  
  /**
   * Creates the info button
   * @returns {HTMLElement} - The created info button
   */
  createInfoButton() {
    const infoButton = document.createElement('div');
    infoButton.className = 'dom-info-button';
    infoButton.style.position = 'absolute';
    infoButton.style.top = '50px';
    infoButton.style.left = '20px';
    infoButton.style.width = '40px';
    infoButton.style.height = '40px';
    infoButton.style.backgroundColor = '#ffff1a'; // Yellow background
    infoButton.style.cursor = 'pointer';
    infoButton.style.textAlign = 'center';
    infoButton.style.lineHeight = '40px';
    infoButton.style.fontFamily = 'Arial, sans-serif';
    infoButton.style.fontSize = '30px';
    infoButton.style.fontWeight = 'bold';
    infoButton.style.color = 'black';
    infoButton.style.pointerEvents = 'auto';
    infoButton.style.zIndex = '20';
    infoButton.textContent = 'i';
    
    infoButton.addEventListener('click', () => {
      console.log('DOM Info button clicked.');
      this.isInfoButtonInteracted = true;
      clearTimeout(this.autoCloseTimeoutId);
      
      if (this.isSplashPanelOpen()) {
        console.log('DOM Info button: Closing splash panel.');
        this.closeSplashPanel();
      } else {
        console.log('DOM Info button: Opening splash panel.');
        this.openSplashPanel();
      }
    });
    
    this.container.appendChild(infoButton);
    this.infoButton = infoButton;
    return infoButton;
  }
  
  /**
   * Creates the navigation buttons (forward/backward)
   * @returns {Object} - Object containing the created nav buttons
   */
  createNavButtons() {
    // Return empty objects for the nav buttons since we're using debug squares instead
    console.log('Navigation buttons not needed - using debug squares instead');
    
    // Just return empty references that won't break existing code
    return {
      backwardButton: { addEventListener: () => {} },
      forwardButton: { addEventListener: () => {} }
    };
  }
  
  /**
   * Opens the splash panel with animation
   */
  openSplashPanel() {
    if (!this.splashPanel) return;
    
    // Make sure the transform is explicitly set to translateX(0)
    this.splashPanel.style.transform = 'translateX(0)';
    
    // Find the splash image and reposition buttons whenever splash is opened
    const splashImage = this.splashPanel.querySelector('img');
    const buttonContainer = this.splashPanel.querySelector('.social-buttons-container');
    
    if (splashImage && buttonContainer) {
      const buttons = buttonContainer.querySelectorAll('.social-button');
      buttons.forEach(button => {
        this.repositionSocialButton(button, splashImage);
      });
    }
    
    // Set auto-close timeout when opened after interaction with info button
    if (this.isInfoButtonInteracted) {
      clearTimeout(this.splashPanelHoverCloseTimeoutId);
      this.splashPanelHoverCloseTimeoutId = setTimeout(() => {
        if (this.isSplashPanelOpen()) {
          console.log('Auto-closing DOM splash panel after info button interaction');
          this.closeSplashPanel();
        }
      }, 5000);
    }
    
    console.log('DOM Splash panel opened and buttons repositioned');
  }
  
  /**
   * Closes the splash panel with animation
   */
  closeSplashPanel() {
    if (!this.splashPanel) return;
    
    // Animate the panel to close position (off-screen)
    const splashImage = this.splashPanel.querySelector('img');
    if (splashImage) {
      const scaledWidth = splashImage.offsetWidth;
      this.splashPanel.style.transform = `translateX(-${scaledWidth}px)`;
      console.log(`Closing splash panel with transform: translateX(-${scaledWidth}px)`);
    } else {
      // Fallback if image isn't loaded yet
      this.splashPanel.style.transform = 'translateX(-100%)';
      console.log('Closing splash panel with fallback transform: translateX(-100%)');
    }
    
    console.log('DOM Splash panel closed');
  }
  
  /**
   * Checks if the splash panel is currently open
   * @returns {Boolean} - True if panel is fully open
   */
  isSplashPanelOpen() {
    if (!this.splashPanel) return false;
    
    // Get the computed transform to check the actual state
    const transform = window.getComputedStyle(this.splashPanel).transform;
    const matrix = new DOMMatrixReadOnly(transform);
    
    // If the X translation is very small (near 0), consider it open
    const isOpen = Math.abs(matrix.m41) < 10;
    console.log(`Checking if splash panel is open: ${isOpen} (transform: ${transform})`);
    
    return isOpen;
  }
  
  /**
   * Handler for window resize
   * This ensures buttons stay properly positioned when window size changes
   */
  handleResize() {
    if (!this.splashPanel) return;
    
    const splashImage = this.splashPanel.querySelector('img');
    const buttonContainer = this.splashPanel.querySelector('.social-buttons-container');
    
    if (splashImage && buttonContainer) {
      const buttons = buttonContainer.querySelectorAll('.social-button');
      buttons.forEach(button => {
        this.repositionSocialButton(button, splashImage);
      });
    }
  }
  
  /**
   * Cleans up all DOM UI elements
   */
  cleanup() {
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
    window.removeEventListener('resize', this.handleResize.bind(this));
    console.log('DOM UI container and all elements cleaned up');
  }
}

export default DomUI;
