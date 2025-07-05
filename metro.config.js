const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web için module sistemi ayarları
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Web için polyfill'ler
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': 'crypto-browserify',
  'stream': 'stream-browserify',
  'buffer': 'buffer',
};

// Web için özel entry point
config.resolver.resolverMainFields = ['web', 'browser', 'main'];

// Web için transformer ayarları
config.transformer.minifierConfig = {
  mangle: {
    keep_fnames: true,
  },
  output: {
    comments: false,
  },
};

module.exports = config; 