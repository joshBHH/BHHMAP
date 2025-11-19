export let map;

export function initMap() {
  map = L.map('map').setView([40.4173, -82.9071], 7);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri World Imagery'
  }).addTo(map);

  console.log("Map initialized – Buckeye Hunter Hub v2");
}
