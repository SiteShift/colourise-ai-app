const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Block problematic packages that require Node.js modules
config.resolver.blockList = [
  // Block ws and realtime packages completely - multiple patterns to ensure complete blocking
  /.*\/node_modules\/@supabase\/realtime-js\/.*/,
  /.*\/node_modules\/ws\/.*/,
  /.*\/ws$/,
  /.*realtime.*/,
  /.*@supabase\/realtime-js.*/,
  // Block any reference to ws package
  /ws/,
  // Block stream module from ws specifically
  /.*\/ws\/lib\/stream\.js$/,
  /.*\/ws\/lib\/.*/,
  // Block WebSocket related packages
  /.*websocket.*/i,
  /.*WebSocket.*/,
];

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
  '@supabase/realtime-js': false,
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
  '@supabase/realtime-js': false,
};

module.exports = config;