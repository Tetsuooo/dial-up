/**
 * Force all layers to be visible
 * This is a debugging utility function
 */
export default function forceShowLayers() {
  const app = window.pixiApp;
  if (!app || !app.stage) {
    console.error("PixiJS app not found");
    return;
  }
  
  // Find the background container
  const backgroundContainer = app.stage.children.find(child => 
    child.sortableChildren && child !== app.stage);
  
  if (!backgroundContainer) {
    console.error("Background container not found");
    return;
  }
  
  console.log("Forcing all layers to be visible");
  backgroundContainer.visible = true;
  backgroundContainer.alpha = 1;
  
  // Force all layer containers to be visible
  backgroundContainer.children.forEach(layerContainer => {
    layerContainer.visible = true;
    layerContainer.alpha = 1;
    console.log(`Force-showing layer with ${layerContainer.children.length} sprites, zIndex=${layerContainer.zIndex}, name=${layerContainer.name || 'unnamed'}`);
    
    // Force all sprites to be visible
    layerContainer.children.forEach(sprite => {
      sprite.visible = true;
      sprite.alpha = 0.8; // Set a good visible alpha for all sprites
    });
  });
  
  // Render to update display
  app.renderer.render(app.stage);
  console.log("All layers should now be visible");
}
