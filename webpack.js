const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  experiments: {
    topLevelAwait: true,
    outputModule: true
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'bundle.js',
    module: true,
    clean: true
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
              ['@babel/plugin-transform-runtime', { regenerator: false }]
            ]
          }
        },
        type: 'javascript/esm'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      scriptLoading: 'module'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets',
          to: 'assets',
          globOptions: {
            ignore: ['**/*.js', '**/*.json']
          }
        }
      ]
    })
  ]
};
