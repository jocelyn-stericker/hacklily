const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

module.exports = {
  mode: "production",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    fallback: {
      fs: false,
      buffer: false,
      http: false,
      path: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.(eot|ttf|woff|woff2|svg|png|gif|jpe?g)$/,
        use: [{ loader: "file-loader" }],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.m?[jt]sx?$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
            plugins: [
              "@babel/plugin-proposal-class-properties",
              [
                "@babel/plugin-transform-runtime",
                {
                  regenerator: true,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  entry: {
    index: "./src/index.tsx",
    status: "./src/status/status.index.tsx",
    musicxml2ly: "./src/musicxml2ly/musicxml2ly.index.tsx",
  },
  output: {
    path: dist,
    filename: "[name].js",
  },
  devServer: {
    static: dist,
  },
  plugins: [
    new CopyPlugin({ patterns: [path.resolve(__dirname, "static")] }),
    new MonacoWebpackPlugin(),
    new webpack.EnvironmentPlugin([
      "REACT_APP_GITHUB_CLIENT_ID",
      "REACT_APP_BACKEND_WS_URL",
    ]),
  ].filter((a) => !!a),
};
