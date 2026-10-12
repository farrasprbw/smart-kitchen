// Simple reactive state store

class StateStore {
  constructor() {
    this.state = {
      activeTab: 'beranda',
      user: { name: 'Sari' },
      scanPhotos: [], // Array of { slotId, dataUrl, base64, mimeType, brightness }
      scanType: 'kulkas', // 'kulkas' or 'belanja'
      detectionResults: null, // Temporary store for confirmation page
      activeRecipe: null,
      isAnalyzing: false,
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State subscriber error:', err);
      }
    }
  }

  clearScan() {
    this.setState({
      scanPhotos: [],
      detectionResults: null,
      isAnalyzing: false
    });
  }
}

export const store = new StateStore();
