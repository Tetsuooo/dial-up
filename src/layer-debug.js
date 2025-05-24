/**
 * Debug panel for layer visibility and control
 * This creates a simple control panel to toggle different layers on/off
 * and test the background and mist layers
 */

class LayerDebugPanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this._callbacks = {
      background: [],
      mist: [],
      samples: [],
      splash: []
    };
  }

  /**
   * Initialize the debug panel
   */
  init() {
    // Create panel if it doesn't exist
    if (!this.panel) {
      this._createPanel();
    }
    
    // Set default visibility
    this.show();
    
    return this;
  }

  /**
   * Add a callback for a specific layer
   */
  onLayerToggle(layerName, callback) {
    if (this._callbacks[layerName]) {
      this._callbacks[layerName].push(callback);
    }
    return this;
  }

  /**
   * Show the debug panel
   */
  show() {
    if (this.panel) {
      this.panel.style.display = 'block';
      this.isVisible = true;
    }
    return this;
  }

  /**
   * Hide the debug panel
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
   * Create the debug panel UI
   */
  _createPanel() {
    // Create panel container
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.padding = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.border = '1px solid #666';
    panel.style.borderRadius = '5px';
    panel.style.color = '#fff';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.zIndex = '9999';
    panel.style.backdropFilter = 'blur(5px)';
    panel.style.minWidth = '200px';
    
    // Add title
    const title = document.createElement('div');
    title.textContent = 'Layer Debug Controls';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.borderBottom = '1px solid #666';
    title.style.paddingBottom = '5px';
    panel.appendChild(title);
    
    // Create layer toggle controls
    const layers = ['background', 'mist', 'samples', 'splash'];
    
    layers.forEach(layer => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.marginBottom = '8px';
      
      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `debug-toggle-${layer}`;
      checkbox.checked = true;
      checkbox.style.marginRight = '8px';
      
      // Create label
      const label = document.createElement('label');
      label.setAttribute('for', `debug-toggle-${layer}`);
      label.textContent = `${layer.charAt(0).toUpperCase() + layer.slice(1)} Layer`;
      
      // Add to row
      row.appendChild(checkbox);
      row.appendChild(label);
      panel.appendChild(row);
      
      // Add event listener
      checkbox.addEventListener('change', (e) => {
        const isVisible = e.target.checked;
        this._notifyLayerToggle(layer, isVisible);
      });
    });
    
    // Add separator
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.backgroundColor = '#666';
    separator.style.margin = '10px 0';
    panel.appendChild(separator);
    
    // Create control buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.flexWrap = 'wrap';
    
    // Force Show All button
    const showAllBtn = document.createElement('button');
    showAllBtn.textContent = 'Force Show All';
    showAllBtn.style.padding = '5px 10px';
    showAllBtn.style.backgroundColor = '#444';
    showAllBtn.style.border = '1px solid #666';
    showAllBtn.style.borderRadius = '3px';
    showAllBtn.style.color = '#fff';
    showAllBtn.style.cursor = 'pointer';
    
    // Restart/Reload button
    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Restart Layers';
    reloadBtn.style.padding = '5px 10px';
    reloadBtn.style.backgroundColor = '#444';
    reloadBtn.style.border = '1px solid #666';
    reloadBtn.style.borderRadius = '3px';
    reloadBtn.style.color = '#fff';
    reloadBtn.style.cursor = 'pointer';
    
    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Debug';
    resetBtn.style.padding = '5px 10px';
    resetBtn.style.backgroundColor = '#444';
    resetBtn.style.border = '1px solid #666';
    resetBtn.style.borderRadius = '3px';
    resetBtn.style.color = '#fff';
    resetBtn.style.cursor = 'pointer';
    
    // Add buttons to container
    buttonContainer.appendChild(showAllBtn);
    buttonContainer.appendChild(reloadBtn);
    buttonContainer.appendChild(resetBtn);
    panel.appendChild(buttonContainer);
    
    // Add event listeners
    showAllBtn.addEventListener('click', () => {
      // Force all layers to be shown with global DOM selector
      document.querySelectorAll('img').forEach(img => {
        img.style.display = 'block';
        img.style.opacity = '1';
      });
      
      // Toggle all checkboxes on
      layers.forEach(layer => {
        const checkbox = document.getElementById(`debug-toggle-${layer}`);
        if (checkbox && !checkbox.checked) {
          checkbox.checked = true;
          this._notifyLayerToggle(layer, true);
        }
      });
    });
    
    reloadBtn.addEventListener('click', () => {
      // Notify all layer callbacks with a special reload message
      layers.forEach(layer => {
        this._notifyLayerToggle(layer, 'reload');
      });
    });
    
    resetBtn.addEventListener('click', () => {
      this.hide();
      setTimeout(() => {
        // Remove panel
        if (this.panel && this.panel.parentNode) {
          this.panel.parentNode.removeChild(this.panel);
          this.panel = null;
        }
        // Recreate panel
        this._createPanel();
        this.show();
      }, 100);
    });
    
    // Add parameter displays
    const paramPanel = document.createElement('div');
    paramPanel.style.marginTop = '10px';
    paramPanel.style.borderTop = '1px solid #666';
    paramPanel.style.paddingTop = '10px';
    paramPanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Layer Parameters:</div>
      <div style="margin-bottom: 8px;">
        <div><b>Background:</b></div>
        <div>• Full window size</div>
        <div>• Speed: 0.085</div>
        <div>• Alpha: 0.5 ± (triangle × 0.2)</div>
      </div>
      <div>
        <div><b>Mist:</b></div>
        <div>• Full window size</div>
        <div>• Speed: 0.025</div>
        <div>• Alpha: 0.4 ± (triangle × 0.1)</div>
      </div>
    `;
    panel.appendChild(paramPanel);
    
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
    
    // Add panel to document
    document.body.appendChild(panel);
    this.panel = panel;
  }

  /**
   * Notify all registered callbacks for a layer
   */
  _notifyLayerToggle(layerName, isVisible) {
    if (this._callbacks[layerName]) {
      this._callbacks[layerName].forEach(callback => {
        callback(isVisible);
      });
    }
  }
}

// Export a singleton instance
export default new LayerDebugPanel();
