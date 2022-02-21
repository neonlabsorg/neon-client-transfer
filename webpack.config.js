const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    // fallback: {
    //   'https': require.resolve("https-browserify"),
    //   'http': require.resolve('stream-http'),
    //   'crypto': require.resolve("crypto-browserify"),
    //   "stream": require.resolve("stream-browserify"),
    //   "assert": require.resolve("assert/"),
    //   "url": require.resolve("url/"),
    //   "os": false
    // }
  }
};