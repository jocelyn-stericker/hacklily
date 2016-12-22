var webpack = require("webpack");
var path = require("path");
var autoprefixer = require("autoprefixer");
var cssnext = require("postcss-cssnext");
var cssimport = require("postcss-import");

module.exports = {
    entry: [
        "./dist/webapp/src/index.js"
    ],
    output: {
        path: __dirname + "/dist/satie",
        filename: "dist.js",
        publicPath: "/"
    },
    externals: {
        "react": "React",
        "react-dom": "ReactDOM",
        "react-dom/server": "ReactDOMServer",
        "satie": "Satie",
        "lodash": "_"
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loaders: [
                    "style-loader",
                    "css-loader?modules",
                    "postcss-loader"
                ]
            }
        ]
    },
    postcss: [
        cssimport({
        }),
        cssnext({
        }),
        autoprefixer({ browsers: ['last 2 version'] })
    ],
    node: {
        fs: "empty"
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: '"production"',
                PLAYGROUND_PREFIX: '"/satie"'
            }
        })
    ]
}
