const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// `.env` / `server/.env` are symlinks to canonical files in ~/.config/saarthi-v2
// (see scripts/bootstrap-worktree.sh). Metro resolves those symlinks, pulls the
// realpath into its graph, and then hands the file to Babel, which fails with
// "SyntaxError: app.env: Unexpected token (1:0)" on the leading comment. Nothing
// imports these files, so excluding them from resolution is safe.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /\.env(\.[^/]+)?$/,
];

module.exports = withNativeWind(config, { input: './src/global.css' });
