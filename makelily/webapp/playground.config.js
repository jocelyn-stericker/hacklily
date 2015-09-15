var webpack = require("webpack");
var path = require("path");
var cssnext = require("cssnext");
var autoprefixer = require("autoprefixer-core");

var port = 4200;
var host = "localhost";

module.exports = {
    port: port,
    host: host,
    entry: [
        "webpack-dev-server/client?http://" + host + ":" + port,
        "webpack/hot/dev-server",
        "./src/index.tsx"
    ],
    output: {
        path: __dirname,
        filename: "dist.js",
        publicPath: "/"
    },
    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".js", ".ts", ".tsx"],
        root: path.join(__dirname, "node_modules"),
        fallback: path.join(__dirname, "..", "node_modules"),
    },
    resolveLoader: {
        root: path.join(__dirname, "node_modules")
    },
    module: {
        loaders: [
            {
                test: /\.ts(x?)$/,
                loaders: [
                    "react-hot",
                    "ts-loader"
                ]
            },
            {
                test: /\.css$/,
                loaders: [
                    "style-loader",
                    "css-loader?sourceMap",
                    "postcss-loader"
                ]
            }
        ]
    },
    postcss: [
        autoprefixer({ browsers: ['last 2 version'] }),
        cssnext({ url: false })
    ],
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
