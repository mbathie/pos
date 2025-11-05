import { loadStripeTerminal } from '@stripe/terminal-js';

// Shared terminal instance across the entire app
let terminalInstance = null;

export const getTerminalInstance = () => terminalInstance;

export const initTerminal = async () => {
  if (!terminalInstance && typeof window !== 'undefined') {
    const StripeTerminal = await loadStripeTerminal();
    if (!StripeTerminal) {
      throw new Error('StripeTerminal failed to load.');
    }

    terminalInstance = StripeTerminal.create({
      onFetchConnectionToken: async () => {
        const res = await fetch('/api/payments/token', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.secret) {
          throw new Error(data.error || 'Failed to fetch connection token');
        }
        return data.secret;
      },
      onUnexpectedReaderDisconnect: () => {
        console.warn('Reader disconnected unexpectedly');
      },
    });
  }
  return terminalInstance;
};
