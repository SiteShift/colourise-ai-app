const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  'crypto': 'crypto-browserify',
  'stream': 'stream-browserify', 
  'buffer': 'buffer',
  'process': 'process/browser',
  'util': 'util',
  'assert': 'assert',
  'url': 'url',
  'querystring': 'querystring-es3',
  'http': 'http-browserify',
  'https': 'https-browserify',
  'os': 'os-browserify',
  'path': 'path-browserify',
  'timers': 'timers-browserify',
  'vm': 'vm-browserify',
  'events': 'events',
  // Exclude ws package entirely since we don't need WebSocket
  'ws': false,
};

config.resolver.fallback = {
  'crypto': 'crypto-browserify',
  'stream': 'stream-browserify',
  'buffer': 'buffer',
  'process': 'process/browser',
  'util': 'util',
  'assert': 'assert',
  'url': 'url',
  'querystring': 'querystring-es3',
  'http': 'http-browserify',
  'https': 'https-browserify',
  'os': 'os-browserify',
  'path': 'path-browserify',
  'timers': 'timers-browserify',
  'vm': 'vm-browserify',
  'events': 'events',
  // Exclude ws package entirely
  'ws': false,
};

module.exports = config;