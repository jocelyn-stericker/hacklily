var webpack = require("webpack");
var package = require("./package.json");

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
                SATIE_VERSION: '"' + package.version + '"',
                NODE_ENV: '"production"'
            }
        })
    ]
}
