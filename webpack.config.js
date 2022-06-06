import path from "path";

export default {
  entry: './src/index.js',
  mode: 'production',
  experiments: {
    outputModule: true
  },
  output: {
    filename: 'index.js',
    module: true,
    path: path.resolve('.', 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ["@babel/plugin-transform-modules-commonjs"]
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
