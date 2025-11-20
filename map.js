let map = null;

export function initMap() {
  map = L.map('map').setView([40.4173, -82.9071], 7);
  L.tileLayer('https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler' }).addTo(map);
  L.control.zoom({ position: 'topleft' }).addTo(map);
  window.map = map;
}
