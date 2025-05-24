const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Block problematic packages that require Node.js modules
// Simplified to only block the essential problematic packages
config.resolver.blockList = [
  // Block only the essential ws and realtime packages
  /.*\/node_modules\/@supabase\/realtime-js\/.*/,
  /.*\/node_modules\/ws\/.*/,
];

config.resolver.alias = {
  'crypto': 'crypto-browserify',
  'stream': 'stream-browserify', 
  'buffer': 'buffer',
  'process': 'process/browser.js',
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
  '@supabase/realtime-js': false,
};

config.resolver.fallback = {
  'crypto': 'crypto-browserify',
  'stream': 'stream-browserify',
  'buffer': 'buffer',
  'process': 'process/browser.js',
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
  '@supabase/realtime-js': false,
};

module.exports = config;