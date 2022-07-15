const path = require("path")
const webpack = require("webpack")

module.exports = {
  entry: {
    NeonPortal: "./src/core/NeonPortal.js",
    MintPortal: "./src/core/MintPortal.js",
  },
  mode: "production",
  output: {
    filename: "[name].js",
    path: path.resolve(".", "dist"),
    library: {
      name: "NeonPortal",
      type: "umd",
      umdNamedDefine: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
              plugins: ["@babel/plugin-transform-modules-commonjs"],
            },
          },
        ],
      },
    ],
  },
  resolve: {
    fallback: {
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http"),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      assert: require.resolve("assert/"),
      url: require.resolve("url/"),
      os: false,
    },
  },
  plugins: [
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
}
