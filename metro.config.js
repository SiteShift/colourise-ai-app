const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Remove blockList since we'll use aliases instead
// config.resolver.blockList = [];

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
  // Replace realtime with mock instead of blocking
  '@supabase/realtime-js': path.resolve(__dirname, 'lib/realtime-mock.js'),
  // Block ws entirely since we have a mock realtime
  'ws': false,
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
  // Replace realtime with mock instead of blocking
  '@supabase/realtime-js': path.resolve(__dirname, 'lib/realtime-mock.js'),
  // Block ws entirely since we have a mock realtime
  'ws': false,
};

module.exports = config;