const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Block problematic packages that require Node.js modules
// Note: All patterns must have consistent flags
config.resolver.blockList = [
  // Block ws and realtime packages completely - all patterns use 'i' flag for consistency
  /.*\/node_modules\/@supabase\/realtime-js\/.*/i,
  /.*\/node_modules\/ws\/.*/i,
  /.*\/ws$/i,
  /.*realtime.*/i,
  /.*@supabase\/realtime-js.*/i,
  // Block any reference to ws package
  /ws/i,
  // Block stream module from ws specifically
  /.*\/ws\/lib\/stream\.js$/i,
  /.*\/ws\/lib\/.*/i,
  // Block WebSocket related packages
  /.*websocket.*/i,
  /.*WebSocket.*/i,
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