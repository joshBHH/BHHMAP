import { map } from './map.js';

const STORAGE_STATE = 'bhh_state_code';
let currentState = localStorage.getItem(STORAGE_STATE) || 'OH';

const STATES = {
  OH: { name: 'Ohio', center: [40.4173, -82.9071], zoom: 7 },
  IN: { name: 'Indiana', center: [39.8, -86.3], zoom: 7 },
  MI: { name: 'Michigan', center: [44.3, -85.6], zoom: 6 },
  PA: { name: 'Pennsylvania', center: [40.9, -77.8], zoom: 7 }
};

let stateLayers = { public: null, counties: null };

async function loadMichigan() {
  const mi = L.geoJSON(null, {
    style: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15 },
    onEachFeature: (f, l) => l.bindPopup(f.properties.NAME || 'MI Public Land')
  });
  const resp = await fetch('https://services1.arcgis.com/jP7d9Y3fXc5tD7AH/arcgis/rest/services/Michigan_Statewide_Lands/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson');
  const data = await resp.json();
  mi.addData(data);
  return mi;
}

async function loadPennsylvania() {
  const pa = L.geoJSON(null, {
    style: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15 },
    onEachFeature: (f, l) => l.bindPopup(f.properties.GAMELAND_NAME || 'PA State Game Land')
  });
  const resp = await fetch('https://opendata.arcgis.com/datasets/2d9ca15d8b9445e7a6ac86d8262f88d8_0.geojson');
  const data = await resp.json();
  pa.addData(data);
  return pa;
}

export async function initStateManager() {
  document.querySelectorAll('[name="bhhState"]').forEach(r => r.addEventListener('change', e => setState(e.target.value)));
  document.getElementById('stateApply')?.addEventListener('click', () => setState(document.getElementById('stateSelect').value));

  setState(currentState);
}

export async function setState(code) {
  code = code.toUpperCase();
  currentState = code;
  localStorage.setItem(STORAGE_STATE, code);
  document.getElementById('stateBadgeText').textContent = STATES[code].name;

  // remove old layers
  if (stateLayers.public) map.removeLayer(stateLayers.public);
  if (stateLayers.counties) map.removeLayer(stateLayers.counties);

  // load new
  if (code === 'MI') stateLayers.public = await loadMichigan();
  if (code === 'PA') stateLayers.public = await loadPennsylvania();
  // OH and IN keep your existing layers

  if (stateLayers.public) stateLayers.public.addTo(map);
  map.setView(STATES[code].center, STATES[code].zoom);
}
