const path = require("path")
const webpack = require("webpack")

module.exports = {
  entry: {
    "neon-portal": "./src/core/index.js",
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
      stream: require.resolve("stream-browserify"),
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
