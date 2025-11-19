// map.js – FULL VERSION WITH YOUR MAPTILER KEY – Hybrid basemap live
let map = null;

export function initMap() {
  map = L.map('map', { zoomControl: false }).setView([40.4173, -82.9071], 7);

  // YOUR ORIGINAL MAPTILER HYBRID BASEMAP (with your key)
  const hybrid = L.tileLayer('https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3', {
    attribution: '&copy; MapTiler &copy; OpenStreetMap contributors'
  }).addTo(map);

  // Other basemaps ready for toggle (uncomment for sheet support)
  const satellite = L.tileLayer('https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3', {
    attribution: '&copy; MapTiler'
  });
  const topo = L.tileLayer('https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3', {
    attribution: '&copy; MapTiler &copy; OpenStreetMap contributors'
  });
  const basic = L.tileLayer('https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3', {
    attribution: '&copy; MapTiler &copy; OpenStreetMap contributors'
  });

  // Store basemaps for easy toggle later
  window.basemaps = { hybrid, satellite, topo, basic };

  // Zoom control below top UI (no overlap)
  L.control.zoom({ position: 'topleft' }).addTo(map);

  // Make map available globally for main.js
  window.map = map;

  console.log("Buckeye Hunter Hub Map – Initialized with MapTiler Hybrid basemap (key VLOZCnjQYBtgpZ3BXBK3)");
}
