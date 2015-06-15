var webpack = require("webpack");
var autoprefixer = require("autoprefixer-core");

var port = 4200;
var host = "localhost";

module.exports = {
    port: port,
    host: host,
    entry: [
        "webpack-dev-server/client?http://" + host + ":" + port,
        "webpack/hot/dev-server",
        "./src/index.ts"
    ],
    output: {
        path: __dirname,
        filename: "dist.js",
        publicPath: "/"
    },
    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".js", ".ts"]
    },
    module: {
        loaders: [
            {
                test: /\.ts$/,
                loaders: [
                    "react-hot",
                    "ts-loader",
                    "ts-jsx-loader"
                ]
            },
            {
                test: /\.less$/,
                loaders: [
                    "style-loader",
                    "css-loader",
                    "less-loader",
                    "postcss-loader"
                ]
            }
        ]
    },
    postcss: [ autoprefixer({ browsers: ['last 2 version'] }) ],
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: '"dev"',
            }
        })
    ]
}
