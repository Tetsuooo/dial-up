const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  experiments: {
    outputModule: true
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'bundle.js',
    module: true,
    clean: true
  },
  resolve: {
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
        },
        // The Modem site's dial-up page fetches this to show its previews:
        // https://dial-up.modemodemodem.xyz/assets/asset-data.json
        { from: 'src/assets/asset-data.json', to: 'assets/asset-data.json' },
        // The custom domain (GitHub Pages reads it from the published folder; the build empties docs/)
        { from: 'CNAME', to: 'CNAME', toType: 'file' }
      ]
    })
  ]
};
