// Simple reactive state store

class StateStore {
  constructor() {
    // Load draft photos from sessionStorage if available
    let savedKulkas = [];
    let savedBelanja = [];
    try {
      const k = sessionStorage.getItem('dapur_draft_kulkas_photos');
      if (k) savedKulkas = JSON.parse(k);
      const b = sessionStorage.getItem('dapur_draft_belanja_photos');
      if (b) savedBelanja = JSON.parse(b);
    } catch (e) {}

    this.state = {
      activeTab: 'beranda',
      user: { name: 'Sari' },
      scanType: 'kulkas', // 'kulkas' or 'belanja'
      kulkasPhotos: savedKulkas,
      belanjaPhotos: savedBelanja,
      scanPhotos: savedKulkas, // Active photo set
      detectionResults: null,
      activeRecipe: null,
      isAnalyzing: false,
    };
    this.listeners = new Set();
  }

  saveDraftPhotos(type, photos) {
    if (type === 'belanja') {
      this.setState({ belanjaPhotos: photos, scanPhotos: photos });
      try {
        sessionStorage.setItem('dapur_draft_belanja_photos', JSON.stringify(photos));
      } catch (e) {}
    } else {
      this.setState({ kulkasPhotos: photos, scanPhotos: photos });
      try {
        sessionStorage.setItem('dapur_draft_kulkas_photos', JSON.stringify(photos));
      } catch (e) {}
    }
  }

  clearScan(type = null) {
    if (!type || type === 'kulkas') {
      try { sessionStorage.removeItem('dapur_draft_kulkas_photos'); } catch (e) {}
      this.setState({ kulkasPhotos: [] });
    }
    if (!type || type === 'belanja') {
      try { sessionStorage.removeItem('dapur_draft_belanja_photos'); } catch (e) {}
      this.setState({ belanjaPhotos: [] });
    }
    this.setState({
      scanPhotos: [],
      detectionResults: null,
      isAnalyzing: false
    });
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
