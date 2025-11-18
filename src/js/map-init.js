// Your map init code extracted – almost identical
const map = L.map('map').setView([40.4173, -82.9071], 7);

// Basemaps (unchanged)
const basic = L.tileLayer('https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler & OpenStreetMap contributors' });
const satellite = L.tileLayer('https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler' });
const topo = L.tileLayer('https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler & OpenStreetMap contributors' });
const hybrid = L.tileLayer('https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler' });

hybrid.addTo(map);
const baseByKey = { basic, satellite, topo, hybrid };
const STORAGE_BASE = 'ui_basemap_key';
function setBasemap(key){
  Object.values(baseByKey).forEach(l=> map.removeLayer(l));
  (baseByKey[key] || hybrid).addTo(map);
  localStorage.setItem(STORAGE_BASE, key);
}
(function restoreBasemap(){
  const k = localStorage.getItem(STORAGE_BASE);
  if(k && baseByKey[k]) setBasemap(k);
})();

// Drawn items (your code unchanged)
const drawnItems = new L.FeatureGroup().addTo(map);
// ... (paste full drawnItems, save/restore, labels code from original)

// Global exports for other modules
window.BHH = { map, drawnItems /* add more as needed */ };

function initApp() {
  // Call init from other modules
  initStateManager(); // From state-manager.js
  initUI(); // From ui.js
  // etc.
}

export { map, initApp };
