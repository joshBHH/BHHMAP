// states.js – full working version with MI/PA layers
import { initMap } from './map.js';

let currentState = localStorage.getItem('bhh_state_code') || 'OH';
let publicLayer = null;

const STATES = {
  OH: { name: 'Ohio', center: [40.4173, -82.9071], zoom: 7 },
  IN: { name: 'Indiana', center: [39.8, -86.3], zoom: 7 },
  MI: { name: 'Michigan', center: [44.3, -85.6], zoom: 6 },
  PA: { name: 'Pennsylvania', center: [40.9, -77.8], zoom: 7 }
};

function loadPublicLand(state) {
  if (publicLayer) map.removeLayer(publicLayer);
  publicLayer = L.geoJSON(null, {
    style: { color: '#6dbc5d', weight: 2, fillOpacity: 0.15 },
    onEachFeature: (f, l) => l.bindPopup(f.properties.NAME || f.properties.GAMELAND_NAME || 'Public Land')
  });

  let url = '';
  if (state === 'MI') url = 'https://opendata.arcgis.com/datasets/0e2f31f8d4f643b08d63f9d1e34bf8fa_0.geojson';
  if (state === 'PA') url = 'https://opendata.arcgis.com/datasets/2d9ca15d8b9445e7a6ac86d8262f88d8_0.geojson';

  if (url) {
    fetch(url)
      .then(r => r.json())
      .then(data => {
        publicLayer.addData(data);
        publicLayer.addTo(map);
      })
      .catch(() => console.log('Public land load failed'));
  }
}

export function initStates() {
  document.getElementById('stateBadgeText').textContent = STATES[currentState].name;
  loadPublicLand(currentState);
  map.setView(STATES[currentState].center, STATES[currentState].zoom);

  // State selector
  document.querySelectorAll('input[name="bhhState"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        currentState = radio.value;
        localStorage.setItem('bhh_state_code', currentState);
        document.getElementById('stateBadgeText').textContent = STATES[currentState].name;
        loadPublicLand(currentState);
        map.setView(STATES[currentState].center, STATES[currentState].zoom);
      }
    });
  });

  // Toggle public land
  document.getElementById('togglePublic')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      publicLayer.addTo(map);
    } else {
      map.removeLayer(publicLayer);
    }
  });
}
