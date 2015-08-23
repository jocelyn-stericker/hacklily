var webpack = require("webpack");
var path = require("path");
var autoprefixer = require("autoprefixer-core");

var port = 4800;
var host = "localhost";

module.exports = {
    port: port,
    host: host,
    entry: [
        "webpack-dev-server/client?http://" + host + ":" + port,
        "webpack/hot/dev-server",
        "./app.tsx"
    ],
    output: {
        path: __dirname,
        filename: "dist.js",
        publicPath: "/"
    },
    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".js", ".ts", ".tsx"],
        root: path.join(__dirname, "node_modules"),
    },
    resolveLoader: {
        extensions: ["", ".webpack.js", ".web.js", ".js", ".ts", ".tsx"],
        root: path.join(__dirname, "node_modules"),
    },
    module: {
        loaders: [
            {
                test: /\.ts(x?)$/,
                loader: "react-hot!ts-loader?compiler=ntypescript&configFileName=playground-tsconfig.json",
                include: path.join(__dirname, ".."),
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
