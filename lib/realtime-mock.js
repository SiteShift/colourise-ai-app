// Mock implementation of @supabase/realtime-js
// This prevents the ws dependency while satisfying Supabase's import requirements

export class RealtimeClient {
  constructor() {
    console.log('Mock RealtimeClient initialized - realtime disabled');
  }
  
  connect() { return this; }
  disconnect() { return this; }
  removeAllChannels() { return this; }
  removeChannel() { return this; }
  channel() {
    return {
      subscribe: () => {},
      unsubscribe: () => {},
      on: () => {},
      off: () => {},
      send: () => {},
      track: () => {},
      untrack: () => {},
    };
  }
  
  setAuth() { return this; }
  onOpen() { return this; }
  onClose() { return this; }
  onError() { return this; }
}

export class RealtimeChannel {
  constructor() {
    console.log('Mock RealtimeChannel initialized - realtime disabled');
  }
  
  subscribe() { return this; }
  unsubscribe() { return this; }
  on() { return this; }
  off() { return this; }
  send() { return this; }
  track() { return this; }
  untrack() { return this; }
}

// Export constants that might be used
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

// Default export
export default {
  RealtimeClient,
  RealtimeChannel,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  REALTIME_LISTEN_TYPES,
  REALTIME_SUBSCRIBE_STATES,
}; 