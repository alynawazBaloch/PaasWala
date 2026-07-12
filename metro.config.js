const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Web platform: replace native-only modules with stubs
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const stubs = {
      'react-native-maps': './web-stubs/react-native-maps.js',
    };
    if (stubs[moduleName]) {
      return {
        type: 'sourceFile',
        filePath: require.resolve(stubs[moduleName]),
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
