var webpack = require("webpack");

module.exports = {
    output: {
        libraryTarget: "var",
        library: "Satie"
    },
    externals: {
        "react": "React",
        "react-dom": "ReactDOM",
        "react-dom/server": "ReactDOMServer",
        "lodash": "_"
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env": {
                SATIE_VERSION: '"dev"',
                NODE_ENV: '"dev"'
            }
        })
    ],
    module: {
        preLoaders: [
            {
                test: /dist\/.*\.js$/,
                loader: "source-map-loader"
            }
        ]
    }
}
