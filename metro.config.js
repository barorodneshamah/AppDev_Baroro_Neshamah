const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      xdate: path.resolve(__dirname, 'node_modules/xdate'),
    },
  },
  // Allow Metro to serve assets from inside node_modules packages
  watchFolders: [path.resolve(__dirname, 'node_modules/react-native-calendars')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
