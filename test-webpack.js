const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'test-dist'),
    filename: 'test-bundle.js',
    clean: true
  }
};
