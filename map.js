export let map, drawnItems, trackLayer, markersLayer;

export function initMap() {
  map = L.map('map').setView([40.4173, -82.9071], 7);

  const hybrid = L.tileLayer('https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=YOUR_KEY_IF_YOU_WANT', { attribution: 'MapTiler' }).addTo(map);
  // add your other basemaps here the same way

  drawnItems = new L.FeatureGroup().addTo(map);
  trackLayer = L.polyline([], {color: '#6dbc5d', weight: 4}).addTo(map);
  markersLayer = new L.FeatureGroup().addTo(map);

  // your draw control, etc. (copy from original)
}
