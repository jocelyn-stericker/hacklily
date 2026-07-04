const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const dist = path.resolve(__dirname, "dist");

/** Read the LilyPond version string from a Dockerfile's ARG LILYPOND_VERSION. */
function readLilyPondVersion(dockerfilePath) {
  const content = fs.readFileSync(
    path.resolve(__dirname, dockerfilePath),
    "utf8"
  );
  const match = content.match(/^ARG LILYPOND_VERSION=(.+)/m);
  if (!match) {
    throw new Error(
      `Could not find ARG LILYPOND_VERSION in ${dockerfilePath}`
    );
  }
  return match[1].trim();
}

module.exports = {
  mode: "production",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    fallback: {
      fs: false,
      buffer: false,
      http: false,
      path: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.(eot|ttf|woff|woff2|svg|png|gif|jpe?g)$/,
        type: "asset/resource",
      },
      {
        // Vendored third-party scripts (e.g. src/vendor/goatcounter-count.js)
        // are imported for their bundled URL, not executed as our own JS --
        // treat them as opaque assets so webpack doesn't run them through
        // babel. This alone does NOT protect them from the production
        // minifier below (TerserPlugin matches by *output* filename, not by
        // module type, so it would otherwise still re-minify these) -- see
        // the `optimization.minimizer` exclude.
        test: /\.js$/,
        include: path.resolve(__dirname, "src/vendor"),
        type: "asset/resource",
        generator: {
          // Fixed, unhashed name: src/analytics.ts and
          // static/about-javascript.html's JS license label link to this
          // path directly, and keeping it stable makes the output trivially
          // diffable against upstream.
          filename: "vendor/[name][ext]",
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.m?[jt]sx?$/,
        exclude: [/(node_modules|bower_components)/, path.resolve(__dirname, "src/vendor")],
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
            plugins: [
              "@babel/plugin-proposal-class-properties",
              [
                "@babel/plugin-transform-runtime",
                {
                  regenerator: true,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  entry: {
    index: "./src/index.tsx",
    status: "./src/status/status.index.tsx",
    musicxml2ly: "./src/musicxml2ly/musicxml2ly.index.tsx",
  },
  output: {
    path: dist,
    filename: "[name].js",
  },
  devServer: {
    static: dist,
  },
  optimization: {
    minimizer: [
      // Re-declares webpack's own default minimizer, but excluding vendored
      // scripts emitted via the asset/resource rule above -- Terser matches
      // assets by output filename regardless of module type, so without this
      // exclude it would silently re-minify src/vendor/goatcounter-count.js,
      // stripping its license header and breaking the byte-for-byte diff
      // against upstream that vendoring verbatim is meant to preserve.
      new TerserPlugin({
        exclude: /^vendor\//,
      }),
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "static"),
          // Mark these as already-minimized so TerserPlugin's default
          // asset-name-based `test` (which matches *any* .js asset in the
          // compilation, not just webpack's own bundles) leaves them alone.
          // Without this, production builds silently re-minify prebuilt JS
          // copied verbatim from static/ (e.g. hackmidi's prebuilt bundle),
          // corrupting sourcemaps and stripping any license headers.
          info: { minimized: true },
        },
      ],
    }),
    new MonacoWebpackPlugin(),
    new webpack.EnvironmentPlugin([
      "REACT_APP_GITHUB_CLIENT_ID",
      "REACT_APP_BACKEND_WS_URL",
    ]),
    new webpack.EnvironmentPlugin({
      HOMEPAGE: "https://hacklily.org",
    }),
    // Bake the LilyPond versions from the Dockerfiles into the bundle
    // so the frontend can display them without a server roundtrip.
    new webpack.DefinePlugin({
      "process.env.REACT_APP_STABLE_LILYPOND_VERSION": JSON.stringify(
        readLilyPondVersion("server/renderer/Dockerfile")
      ),
      "process.env.REACT_APP_UNSTABLE_LILYPOND_VERSION": JSON.stringify(
        readLilyPondVersion("server/renderer-unstable/Dockerfile")
      ),
    }),
  ].filter((a) => !!a),
};
