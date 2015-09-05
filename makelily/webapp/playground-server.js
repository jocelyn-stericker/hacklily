#!/usr/bin/env node
var webpack = require("webpack");
var WebpackDevServer = require("webpack-dev-server");
var config = require("./playground.config");

new WebpackDevServer(webpack(config), {
  contentBase: "static",
  publicPath: config.output.publicPath,
  hot: true,
  stats: { colors: true },
  historyApiFallback: true
}).listen(config.port, config.host, function (err, result) {
  if (err) {
    console.log(err);
  }

  console.log("Listening at " + config.host + ":" + config.port);
});
