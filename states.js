import { map } from '/BHHMAP/map.js';

let currentState = localStorage.getItem('bhh_state_code') || 'OH';
let publicLayer = null;

async function loadPublicLand(state) {
  if (publicLayer) map.removeLayer(publicLayer);
  publicLayer = L.geoJSON(null, { style: { color: '#6dbc5d', weight: 2, fillOpacity: 0.15 } });

  let url = '';
  if (state === 'MI') url = 'https://opendata.arcgis.com/datasets/0e2f31f8d4f643b08d63f9d1e34bf8fa_0.geojson';
  if (state === 'PA') url = 'https://opendata.arcgis.com/datasets/2d9ca15d8b9445e7a6ac86d8262f88d8_0.geojson';

  if (url) {
    fetch(url).then(r => r.json()).then(data => {
      publicLayer.addData(data);
      publicLayer.addTo(map);
    });
  }
}

export function initStates() {
  document.getElementById('stateBadgeText').textContent = (currentState === 'MI' ? 'Michigan' : currentState === 'PA' ? 'Pennsylvania' : currentState === 'IN' ? 'Indiana' : 'Ohio');
  loadPublicLand(currentState);
  map.setView(currentState === 'MI' ? [44.3, -85.6] : currentState === 'PA' ? [40.9, -77.8] : currentState === 'IN' ? [39.8, -86.3] : [40.4173, -82.9071], currentState === 'MI' ? 6 : 7);

  document.querySelectorAll('input[name="bhhState"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        currentState = radio.value;
        localStorage.setItem('bhh_state_code', currentState);
        document.getElementById('stateBadgeText').textContent = radio.parentElement.textContent.trim().split(' ')[0];
        loadPublicLand(currentState);
        map.setView(currentState === 'MI' ? [44.3, -85.6] : currentState === 'PA' ? [40.9, -77.8] : currentState === 'IN' ? [39.8, -86.3] : [40.4173, -82.9071], currentState === 'MI' ? 6 : 7);
      }
    });
  });
}
