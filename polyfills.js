// polyfills.js

// This MUST be first: For crypto.getRandomValues
import 'react-native-get-random-values';

// For URL and URLSearchParams
import 'react-native-url-polyfill/auto';

// Buffer polyfill - Make Buffer globally available
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Process polyfill
import process from 'process';
global.process = process;

// Ensure process.nextTick is available
if (typeof global.process.nextTick === 'undefined') {
  global.process.nextTick = function (callback, ...args) {
    setTimeout(() => { // Using setTimeout to simulate nextTick
      callback(...args);
    }, 0);
  };
}

console.log('[Polyfills] Loaded: get-random-values, url-polyfill, Buffer, process'); 