const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  experiments: {
    topLevelAwait: true,
    outputModule: true
  },
  output: {
    module: true
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
      'Strategies': path.resolve(__dirname, 'src/strategies')
    },
    extensions: ['.js', '.mjs']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  esmodules: true
                },
                modules: false
              }]
            ],
            plugins: [
              '@babel/plugin-transform-runtime'
            ]
          }
        },
        type: 'javascript/esm'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ]
};
