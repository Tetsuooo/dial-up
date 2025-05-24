/**
 * Display List Debugging Tool
 * Helps diagnose issues with PixiJS display list
 */

export const analyzeDisplayList = (app) => {
  console.log("====== DISPLAY LIST ANALYSIS ======");
  
  if (!app) {
    console.error("No app provided to analyzeDisplayList");
    return;
  }
  
  const stage = app.stage;
  if (!stage) {
    console.error("App has no stage");
    return;
  }
  
  console.log(`Stage: visible=${stage.visible}, alpha=${stage.alpha}, children=${stage.children.length}`);
  
  const analyzeContainer = (container, depth = 0) => {
    const indent = " ".repeat(depth * 2);
    
    container.children.forEach((child, index) => {
      const type = child.constructor.name;
      const pos = `x=${child.x.toFixed(0)},y=${child.y.toFixed(0)}`;
      const vis = `visible=${child.visible},alpha=${child.alpha.toFixed(2)}`;
      const dim = `w=${child.width?.toFixed(0) || '?'},h=${child.height?.toFixed(0) || '?'}`;
      const zIndex = `z=${child.zIndex || 0}`;
      
      console.log(`${indent}Child ${index}: [${type}] ${pos} ${vis} ${dim} ${zIndex}`);
      
      if (child.children && child.children.length > 0) {
        console.log(`${indent}Container with ${child.children.length} children:`);
        analyzeContainer(child, depth + 1);
      }
    });
  };
  
  analyzeContainer(stage);
  console.log("====== END DISPLAY LIST ANALYSIS ======");
};

// Add to window for console debugging
if (typeof window !== 'undefined') {
  window.analyzeDisplayList = analyzeDisplayList;
  console.log("Display debug tool loaded - call analyzeDisplayList(app) in console");
}

export default { analyzeDisplayList };
