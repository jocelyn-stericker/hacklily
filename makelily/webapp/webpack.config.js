var webpack = require("webpack");
var path = require("path");
var cssnext = require("cssnext");
var autoprefixer = require("autoprefixer-core");

module.exports = {
    entry: [
        "./src/index.tsx"
    ],
    output: {
        path: __dirname + "/dist/satie",
        filename: "dist.js",
        publicPath: "/"
    },
    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".js", ".ts", ".tsx"],
        root: path.join(__dirname, "node_modules"),
        fallback: path.join(__dirname, "..", "node_modules")
    },
    resolveLoader: {
        root: path.join(__dirname, "node_modules")
    },
    module: {
        loaders: [
            {
                test: /\.ts(x)?$/,
                loaders: [
                    "ts-loader?compiler=ntypescript"
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
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: '"production"',
                PLAYGROUND_PREFIX: '"/satie"'
            }
        })
    ]
}
