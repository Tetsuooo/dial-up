/* global SC */

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------
import AssetData from './assets/asset-data.json';
import MixUrls from './mixurls.json';
import ArtistLinks from './artist-links.json';
import DomUI from './dom-ui.js';
import { mountMix } from './layers/index.js';
import { assetUrl } from './layers/assets.js';

(() => {
  // ---------------------------------------------------------------------
  // CONFIGURATION CONSTANTS
  // ---------------------------------------------------------------------
  const MIX_COUNT = 40;

  // UI related variables
  let isInfoButtonInteracted = false;

  // Create DOM UI instance
  let domUI = new DomUI();

  // ---------------------------------------------------------------------
  // FULLSCREEN CSS & APP CONFIG
  // ---------------------------------------------------------------------
  document.body.style.overflow = 'hidden';
  document.body.style.padding = '0';
  document.body.style.margin = '0';
  document.body.style.width = '100%';
  document.body.style.height = '100%';

  // Create bottom-right mix navigation buttons
  const createBottomRightNavButtons = () => {
    const navContainer = document.createElement('div');
    navContainer.style.position = 'fixed';
    navContainer.style.bottom = '40px'; // Moved up from 30px
    navContainer.style.right = '20px';
    navContainer.style.display = 'flex';
    navContainer.style.flexDirection = 'column'; // Stack vertically
    navContainer.style.gap = '10px'; // Increased from 5px to 10px
    navContainer.style.zIndex = '2002';
    
    // Next mix button (on top)
    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.style.width = '50px';
    nextButton.style.height = '50px';
    nextButton.style.backgroundColor = '#ffff1a';
    nextButton.style.border = 'none';
    nextButton.style.cursor = 'pointer';
    nextButton.style.fontSize = '28px'; // Increased from 24px to 28px
    nextButton.style.fontWeight = 'bold';
    nextButton.style.color = 'black';
    nextButton.style.borderRadius = '0';
    nextButton.style.userSelect = 'none';
    
    // Previous mix button (on bottom)
    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.style.width = '50px';
    prevButton.style.height = '50px';
    prevButton.style.backgroundColor = '#ffff1a';
    prevButton.style.border = 'none';
    prevButton.style.cursor = 'pointer';
    prevButton.style.fontSize = '28px'; // Increased from 24px to 28px
    prevButton.style.fontWeight = 'bold';
    prevButton.style.color = 'black';
    prevButton.style.borderRadius = '0';
    prevButton.style.userSelect = 'none';
    
    // Add hover effects
    [prevButton, nextButton].forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#ffffff';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#ffff1a';
      });
    });
    
    // Add click handlers
    prevButton.addEventListener('click', () => changeMix(-1));
    nextButton.addEventListener('click', () => changeMix(1));
    
    // Add next button first (top), then prev button (bottom)
    navContainer.appendChild(nextButton);
    navContainer.appendChild(prevButton);
    document.body.appendChild(navContainer);
    
    return { container: navContainer, prevButton, nextButton };
  };

  const bottomRightNav = createBottomRightNavButtons();

  // Size the > < buttons: smaller on phones (they covered too much of the collage there)
  // (at load, desktop keeps the buttons' original 50px — as before, they only rescale on a resize)
  const sizeBottomRightNav = (atLoad) => {
    const phone = Math.min(window.innerWidth, window.innerHeight) <= 600;
    if (atLoad && !phone) return;
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    const buttonSize = phone ? 34 : Math.max(40, Math.round(50 * Math.max(0.8, Math.min(1.2, scale))));
    const fontSize = phone ? 19 : Math.max(20, Math.round(28 * Math.max(0.8, Math.min(1.2, scale))));
    bottomRightNav.container.style.bottom = phone ? '20px' : '40px';
    bottomRightNav.container.style.right = phone ? '12px' : '20px';
    bottomRightNav.container.style.gap = phone ? '6px' : '10px';
    [bottomRightNav.prevButton, bottomRightNav.nextButton].forEach(button => {
      button.style.width = `${buttonSize}px`;
      button.style.height = `${buttonSize}px`;
      button.style.fontSize = `${fontSize}px`;
    });
  };
  sizeBottomRightNav(true);

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

    let isDragging = false;
    let lastUpdateTime = 0;

    // Function to seek to position
    const seekToPosition = (e) => {
      if (!scPlayer) return;
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      scPlayer.getDuration((duration) => {
        scPlayer.seekTo(duration * pos);
      });
    };

    // Function to update visual progress (for dragging feedback)
    const updateVisualProgress = (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      progress.style.width = `${pos * 100}%`;
    };

    // Mouse down - start dragging
    progressBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      progressBar.style.cursor = 'grabbing';
      updateVisualProgress(e); // Immediate visual feedback
      seekToPosition(e);
      e.preventDefault();
    });

    // Mouse move - drag to seek
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // Always update visual progress immediately for smooth feedback
      updateVisualProgress(e);
      
      // Throttle actual seeking to avoid overwhelming the SoundCloud API
      const now = Date.now();
      if (now - lastUpdateTime > 50) // Update max every 50ms
        seekToPosition(e);
        lastUpdateTime = now;
      e.preventDefault();
    });

    // Mouse up - stop dragging
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        progressBar.style.cursor = 'pointer';
      }
    });

    // Click handler for non-drag clicks
    progressBar.addEventListener('click', (e) => {
      if (!isDragging) {
        updateVisualProgress(e); // Immediate visual feedback
        seekToPosition(e);
      }
    });

    // Update progress periodically (only when not dragging)
    setInterval(() => {
      if (scPlayer && isPlaying && !isDragging) {
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
    svg.style.bottom = "5px";   // Moved down from 10px to 5px
    svg.style.left = "-10px";    // Moved further left from 5px to -5px
    svg.style.width = "180px";  // Reduced from 180px (smaller)
    svg.style.height = "180px"; // Reduced from 180px (smaller)
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "none"; // Disable pointer events on the SVG container
    svg.style.zIndex = "2000";

    // Create play triangle
    const playShape = document.createElementNS(svgNS, "polygon");
    // Adjusted coordinates to stay within viewBox bounds
    playShape.setAttribute("points", "40,40 40,160 140,100");
    playShape.setAttribute("fill", "yellow");
    playShape.style.cursor = "pointer"; // Only the shape is clickable
    playShape.style.pointerEvents = "auto"; // Enable pointer events only on the shape
    svg.appendChild(playShape);

    // Create invisible clickable area for pause button (covers the gap between rectangles)
    const pauseClickArea = document.createElementNS(svgNS, "rect");
    pauseClickArea.setAttribute("x", "40");
    pauseClickArea.setAttribute("y", "40");
    pauseClickArea.setAttribute("width", "110"); // Covers both rectangles and gap
    pauseClickArea.setAttribute("height", "120");
    pauseClickArea.setAttribute("fill", "transparent");
    pauseClickArea.style.cursor = "pointer";
    pauseClickArea.style.pointerEvents = "none"; // Initially disabled
    pauseClickArea.style.display = "none"; // Initially hidden
    svg.appendChild(pauseClickArea);

    // Add click handler for play/pause toggle - now only on the shape
    const handleClick = () => {
      const isPlayButton = playShape.getAttribute("points") === "40,40 40,160 140,100";
      if (isPlayButton) {
        // Switch to pause symbol - rectangles moved closer together
        playShape.setAttribute("points", "40,40 75,40 75,160 40,160, 40,40 115,40 150,40 150,160 115,160 115,40");
        // Enable and show the pause click area
        pauseClickArea.style.pointerEvents = "auto";
        pauseClickArea.style.display = "block";
        // Disable the main shape's pointer events since we want the area to handle it
        playShape.style.pointerEvents = "none";
      } else {
        // Switch back to play triangle
        playShape.setAttribute("points", "40,40 40,160 140,100");
        // Disable and hide the pause click area
        pauseClickArea.style.pointerEvents = "none";
        pauseClickArea.style.display = "none";
        // Re-enable the main shape's pointer events
        playShape.style.pointerEvents = "auto";
      }
      togglePlay();
    };

    playShape.addEventListener('click', handleClick);
    pauseClickArea.addEventListener('click', handleClick);

    return svg;
  };

  let playPauseSVG = createPlaySVG();
  document.body.appendChild(playPauseSVG);
  domUI.scaleExternalUIElements(); // its size for this screen right away (smaller on phones), not only after a resize

  const initSoundCloud = () => {
    // the player of the previous mix (paused when changing mix) isn't needed any more
    document.getElementById('sc-widget')?.remove();
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

  // The layers (gradient, mist, samples, background) of the mix that's showing
  let currentMix = null;

  const renderPage = () => {
    // Take away the previous mix: its images, its timers and its animations
    if (currentMix) currentMix.destroy();
    currentMix = null;

    // Clean up DOM UI
    domUI.cleanup();

    // Create a new DOM UI instance
    domUI = new DomUI();

    // Store the isInfoButtonInteracted flag for the new instance
    domUI.isInfoButtonInteracted = false;
    isInfoButtonInteracted = false;

    const mixName = window.location.hash.replace('#', '') || 'mix01';
    const links = ArtistLinks[mixName] || {};

    // --- Splash Panel and Social/Info Buttons Setup ---
    const splashFilename = AssetData[mixName]?.splash?.[0]?.filename;
    if (splashFilename) {
      // Determine orientation and set appropriate scale
      const isPortrait = window.innerWidth < window.innerHeight;
      const splashScale = isPortrait ? 1.2 : 0.6; // 2x size (1.2) in portrait, 0.6 in landscape

      // ---- Create DOM Splash Panel ----
      // Create the DOM splash panel with orientation-aware scaling
      domUI.createSplashPanel({
        imageUrl: assetUrl(mixName, 'splash', splashFilename),
        mixName: mixName,
        links: links,
        initiallyOpen: true,
        yOffset: 100,
        scale: splashScale // Pass the scale to DOM UI
      });

      // Initial auto-close timeout is handled in the DOM UI implementation
    } else {
      console.error(`No splash asset filename found in asset-data.json for mix: ${mixName}`);
    }

    // Create DOM Info Button
    domUI.createInfoButton();

    // Store flag for keeping track of info button interactions
    domUI.isInfoButtonInteracted = isInfoButtonInteracted;

    // --- End Splash Panel Setup ---

    if (AssetData[mixName]) {
      currentMix = mountMix(mixName, AssetData);
    } else {
      console.error(`No assets found for mix: ${mixName}`);
    }
  };

  if (!window.location.hash) {
    // no mix in the address: start with the first (replaceState, so there's no second render from a hashchange)
    history.replaceState(null, '', '#mix01');
  }
  renderPage();

  // Add hash change event listener to re-render when URL changes
  window.addEventListener('hashchange', () => {
    renderPage();
  });

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
      renderPage();
      
      // Handle resizing of DOM UI elements
      if (domUI) {
        domUI.handleResize();
      }
      
      // Scale bottom-right navigation buttons
      if (bottomRightNav) sizeBottomRightNav();
    }, 250);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      changeMix(-1);
    } else if (e.key === 'ArrowRight') {
      changeMix(1);
    }
  });

})();
