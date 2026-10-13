// Simple reactive state store

class StateStore {
  constructor() {
    // Load draft photos & detection results from sessionStorage if available
    let savedKulkas = [];
    let savedBelanja = [];
    let savedDetection = null;
    let savedScanType = 'kulkas';
    try {
      const k = sessionStorage.getItem('dapur_draft_kulkas_photos');
      if (k) savedKulkas = JSON.parse(k);
      const b = sessionStorage.getItem('dapur_draft_belanja_photos');
      if (b) savedBelanja = JSON.parse(b);
      const d = sessionStorage.getItem('dapur_draft_detection_results');
      if (d) savedDetection = JSON.parse(d);
      const st = sessionStorage.getItem('dapur_scan_type');
      if (st) savedScanType = st;
    } catch (e) {}

    this.state = {
      activeTab: 'beranda',
      user: { name: 'Sari' },
      scanType: savedScanType, // 'kulkas' or 'belanja'
      kulkasPhotos: savedKulkas,
      belanjaPhotos: savedBelanja,
      scanPhotos: savedScanType === 'belanja' ? savedBelanja : savedKulkas,
      detectionResults: savedDetection,
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
    try { sessionStorage.removeItem('dapur_draft_detection_results'); } catch (e) {}
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

    // Persist detection results across page refreshes
    if ('detectionResults' in updates) {
      try {
        if (updates.detectionResults) {
          sessionStorage.setItem('dapur_draft_detection_results', JSON.stringify(updates.detectionResults));
        } else {
          sessionStorage.removeItem('dapur_draft_detection_results');
        }
      } catch (e) {}
    }

    if ('scanType' in updates && updates.scanType) {
      try {
        sessionStorage.setItem('dapur_scan_type', updates.scanType);
      } catch (e) {}
    }

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
}

export const store = new StateStore();
