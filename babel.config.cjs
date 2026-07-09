// babel config shared by webpack and jest. webpack.config.js keeps its own
// inline babel-loader options for parity; if you change presets/plugins here,
// update webpack.config.js too.
module.exports = {
  presets: [
    "@babel/preset-env",
    "@babel/preset-react",
    "@babel/preset-typescript",
  ],
  plugins: [
    "@babel/plugin-proposal-class-properties",
    ["@babel/plugin-transform-runtime", { regenerator: true }],
  ],
};