// Mock implementation of @supabase/realtime-js
// This prevents the ws dependency while satisfying Supabase's import requirements

// Mock WebSocket that doesn't require 'ws' or 'stream'
class MockWebSocket {
  constructor() {
    console.log('Mock WebSocket initialized - no network functionality');
    this.readyState = 1; // OPEN
  }
  
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

// Make sure WebSocket is available globally for the mock
if (typeof global !== 'undefined' && !global.WebSocket) {
  global.WebSocket = MockWebSocket;
}

export class RealtimeClient {
  constructor(endpointURL, options = {}) {
    console.log('Mock RealtimeClient initialized - realtime disabled');
    this.endpointURL = () => endpointURL;
    this.headers = {};
    this.channels = [];
    this.conn = null;
  }
  
  connect() { 
    console.log('Mock RealtimeClient.connect() - no-op');
    return this; 
  }
  
  disconnect() { 
    console.log('Mock RealtimeClient.disconnect() - no-op');
    return this; 
  }
  
  removeAllChannels() { 
    this.channels = [];
    return this; 
  }
  
  removeChannel(channel) { 
    const index = this.channels.indexOf(channel);
    if (index > -1) {
      this.channels.splice(index, 1);
    }
    return this; 
  }
  
  channel(topic, chanParams = {}) {
    console.log(`Mock RealtimeClient.channel(${topic}) - returning mock channel`);
    const channel = new RealtimeChannel(topic, chanParams, this);
    this.channels.push(channel);
    return channel;
  }
  
  setAuth(token) { 
    this.headers['Authorization'] = `Bearer ${token}`;
    return this; 
  }
  
  onOpen(callback) { 
    // Immediately call callback to simulate connection
    if (callback) setTimeout(callback, 0);
    return this; 
  }
  
  onClose(callback) { 
    return this; 
  }
  
  onError(callback) { 
    return this; 
  }
}

export class RealtimeChannel {
  constructor(topic, params = {}, socket) {
    console.log(`Mock RealtimeChannel initialized for topic: ${topic}`);
    this.topic = topic;
    this.params = params;
    this.socket = socket;
    this.bindings = [];
    this.state = 'closed';
  }
  
  subscribe(callback) { 
    console.log(`Mock RealtimeChannel.subscribe() for topic: ${this.topic}`);
    this.state = 'joined';
    if (callback) setTimeout(() => callback('SUBSCRIBED', {}), 0);
    return this; 
  }
  
  unsubscribe() { 
    console.log(`Mock RealtimeChannel.unsubscribe() for topic: ${this.topic}`);
    this.state = 'closed';
    return this; 
  }
  
  on(type, filter, callback) { 
    this.bindings.push({ type, filter, callback });
    return this; 
  }
  
  off(type, filter) { 
    this.bindings = this.bindings.filter(bind => 
      bind.type !== type || bind.filter !== filter
    );
    return this; 
  }
  
  send(payload) { 
    console.log(`Mock RealtimeChannel.send() for topic: ${this.topic}`, payload);
    return this; 
  }
  
  track(payload) { 
    console.log(`Mock RealtimeChannel.track() for topic: ${this.topic}`, payload);
    return this; 
  }
  
  untrack() { 
    console.log(`Mock RealtimeChannel.untrack() for topic: ${this.topic}`);
    return this; 
  }
}

// Export constants that match the real package
export const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {
  ALL: '*',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

export const REALTIME_LISTEN_TYPES = {
  POSTGRES_CHANGES: 'postgres_changes',
  BROADCAST: 'broadcast',
  PRESENCE: 'presence',
};

export const REALTIME_SUBSCRIBE_STATES = {
  SUBSCRIBED: 'SUBSCRIBED',
  TIMED_OUT: 'TIMED_OUT',
  CLOSED: 'CLOSED',
  CHANNEL_ERROR: 'CHANNEL_ERROR',
};

// Named exports that might be used
export const RealtimePresence = RealtimeChannel;
export const RealtimeBroadcast = RealtimeChannel;

// Default export that matches the real package structure
export default {
  RealtimeClient,
  RealtimeChannel,
  RealtimePresence,
  RealtimeBroadcast,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  REALTIME_LISTEN_TYPES,
  REALTIME_SUBSCRIBE_STATES,
}; 