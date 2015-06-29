var webpack = require("webpack");
var path = require("path");
var autoprefixer = require("autoprefixer-core");

module.exports = {
    entry: [
        "./src/index.ts"
    ],
    output: {
        path: __dirname + "/dist/satie",
        filename: "dist.js",
        publicPath: "/"
    },
    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".js", ".ts"],
        root: path.join(__dirname, "node_modules"),
        fallback: path.join(__dirname, "..", "node_modules")
    },
    resolveLoader: {
        root: path.join(__dirname, "node_modules")
    },
    module: {
        loaders: [
            {
                test: /\.ts$/,
                loaders: [
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
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: '"production"',
                PLAYGROUND_PREFIX: '"/satie"'
            }
        })
    ]
}
