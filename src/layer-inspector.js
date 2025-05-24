/**
 * Layer parameter inspector
 * Shows current values of background and mist parameters
 */

class LayerInspector {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.updateInterval = null;
    this.paramValues = {
      background: {
        moveSpeed: 0.085,
        alphaBase: 0.5,
        alphaRange: 0.2
      },
      mist: {
        moveSpeed: 0.025,
        alphaBase: 0.4,
        alphaRange: 0.1
      }
    };
  }
  
  /**
   * Initialize the inspector panel
   */
  init() {
    if (!this.panel) {
      this._createPanel();
    }
    this.startUpdating();
    return this;
  }
  
  /**
   * Show the inspector panel
   */
  show() {
    if (this.panel) {
      this.panel.style.display = 'block';
      this.isVisible = true;
    }
    return this;
  }
  
  /**
   * Hide the inspector panel
   */
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
      this.isVisible = false;
    }
    return this;
  }
  
  /**
   * Toggle panel visibility
   */
  toggle() {
    return this.isVisible ? this.hide() : this.show();
  }
  
  /**
   * Start updating the panel with current values
   */
  startUpdating() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Set up new interval
    this.updateInterval = setInterval(() => {
      this._updateValues();
    }, 500);
    
    return this;
  }
  
  /**
   * Stop updating the panel
   */
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    return this;
  }
  
  /**
   * Create the inspector panel
   */
  _createPanel() {
    // Create panel
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.right = '10px';
    panel.style.padding = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.border = '1px solid #666';
    panel.style.borderRadius = '5px';
    panel.style.color = '#fff';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.zIndex = '9998';
    panel.style.minWidth = '180px';
    
    // Add title
    const title = document.createElement('div');
    title.textContent = 'Layer Parameters';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.borderBottom = '1px solid #666';
    title.style.paddingBottom = '5px';
    panel.appendChild(title);
    
    // Create section for background parameters
    const bgSection = document.createElement('div');
    bgSection.innerHTML = `
      <div style="font-weight: bold; color: #88f;">Background:</div>
      <div id="bg-params">
        <div>Speed: <span id="bg-speed">0.085</span></div>
        <div>Alpha Base: <span id="bg-alpha-base">0.5</span></div>
        <div>Alpha Range: <span id="bg-alpha-range">±0.2</span></div>
        <div>Current Alpha: <span id="bg-current-alpha">N/A</span></div>
      </div>
    `;
    bgSection.style.marginBottom = '10px';
    panel.appendChild(bgSection);
    
    // Create section for mist parameters
    const mistSection = document.createElement('div');
    mistSection.innerHTML = `
      <div style="font-weight: bold; color: #8f8;">Mist:</div>
      <div id="mist-params">
        <div>Speed: <span id="mist-speed">0.025</span></div>
        <div>Alpha Base: <span id="mist-alpha-base">0.4</span></div>
        <div>Alpha Range: <span id="mist-alpha-range">±0.1</span></div>
        <div>Current Alpha: <span id="mist-current-alpha">N/A</span></div>
      </div>
    `;
    panel.appendChild(mistSection);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '5px';
    closeBtn.style.backgroundColor = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#aaa';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.width = '20px';
    closeBtn.style.height = '20px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    
    closeBtn.addEventListener('click', () => this.hide());
    panel.appendChild(closeBtn);
    
    // Add to document
    document.body.appendChild(panel);
    this.panel = panel;
    
    // Hide by default
    this.hide();
  }
  
  /**
   * Update parameter values in the panel
   */
  _updateValues() {
    if (!this.panel || !this.isVisible) return;
    
    // Get all currently visible background and mist elements
    const bgElements = document.querySelectorAll('img[data-layer-type="background"]');
    const mistElements = document.querySelectorAll('img[data-layer-type="mist"]');
    
    // Update background current alpha
    if (bgElements.length > 0) {
      const bgAlphas = Array.from(bgElements).map(el => parseFloat(el.style.opacity) || 0);
      const avgBgAlpha = bgAlphas.reduce((sum, a) => sum + a, 0) / bgAlphas.length;
      document.getElementById('bg-current-alpha').textContent = avgBgAlpha.toFixed(2);
    } else {
      document.getElementById('bg-current-alpha').textContent = 'N/A';
    }
    
    // Update mist current alpha
    if (mistElements.length > 0) {
      const mistAlphas = Array.from(mistElements).map(el => parseFloat(el.style.opacity) || 0);
      const avgMistAlpha = mistAlphas.reduce((sum, a) => sum + a, 0) / mistAlphas.length;
      document.getElementById('mist-current-alpha').textContent = avgMistAlpha.toFixed(2);
    } else {
      document.getElementById('mist-current-alpha').textContent = 'N/A';
    }
  }
}

// Export singleton instance
export default new LayerInspector();
