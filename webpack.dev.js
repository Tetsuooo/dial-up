const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.js');
const path = require('path');
const express = require('express');

const devConfig = merge(baseConfig, {
  mode: 'development',
  target: 'web',
  devtool: 'eval-source-map',
  // hot reloading doesn't work with the module bundle that is built for production
  experiments: {
    outputModule: false
  },
  output: {
    module: false,
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'src'),
      publicPath: '/',
      serveIndex: true,
      watch: true,
    },
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
    devMiddleware: {
      publicPath: '/'
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Serve assets with correct MIME types
      devServer.app.use('/assets', (req, res, next) => {
        const filePath = path.join(__dirname, 'src', req.path);
        if (req.path.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/webp');
        }
        express.static(path.join(__dirname, 'src/assets'))(req, res, next);
      });

      return middlewares;
    }
  }
});

// The dev server already serves src/assets (see `static` above), so don't copy the 800 MB of images
devConfig.plugins = devConfig.plugins.filter(plugin => plugin.constructor.name !== 'CopyPlugin');

module.exports = devConfig;
