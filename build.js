const webpack = require('webpack');
const config = require('./webpack.js');

webpack(config, (err, stats) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (stats.hasErrors()) {
    console.error('Build failed with errors:');
    console.error(stats.toString({
      colors: true,
      all: false,
      errors: true,
      warnings: true
    }));
    process.exit(1);
  }
  
  console.log(stats.toString({
    colors: true,
    chunks: false,
    children: false,
    modules: false,
    chunkModules: false
  }));
  
  console.log('\n✅ Build completed successfully!');
});
