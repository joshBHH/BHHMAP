// map.js — FINAL FIXED VERSION (no black screen)
export let map = null;

export function initMap() {
  map = L.map('map', {
    zoomControl: false   // we control zoom position ourselves
  }).setView([40.4173, -82.9071], 7);

  // Your basemap (MapTiler or Esri – both work, pick one)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri World Imagery'
  }).addTo(map);

  // Re-add zoom control in the right place (below top UI)
  L.control.zoom({ position: 'topleft' }).addTo(map);

  console.log("Map initialized – Buckeye Hunter Hub v2");
}
