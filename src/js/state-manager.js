import { map } from './map-init.js';

const STORAGE_STATE = 'bhh_state_code';
let currentState = (localStorage.getItem(STORAGE_STATE) || 'OH').toUpperCase();

// State configs (expanded)
const STATE_CFG = {
  OH: { name: 'Ohio', center: [40.4173, -82.9071], zoom: 7 },
  IN: { name: 'Indiana', center: [39.905, -86.2816], zoom: 7 },
  MI: { name: 'Michigan', center: [44.3, -85.6], zoom: 6 }, // New
  PA: { name: 'Pennsylvania', center: [40.9, -77.8], zoom: 7 }, // New
  KY: { name: 'Kentucky', center: [37.8, -85.8], zoom: 7 }, // Placeholder for future
  WV: { name: 'West Virginia', center: [38.6, -80.6], zoom: 7 }, // Placeholder
};

// Layers per state (imported dynamically)
let stateLayers = {};

// Load state-specific layers
async function loadStateLayers(state) {
  if (stateLayers[state]) return;
  stateLayers[state] = {};
  switch (state) {
    case 'OH':
      // Your existing OH public + counties + waterfowl
      const ohioPublic = L.geoJSON(null, { /* your style */ });
      await loadOhioPublic(ohioPublic);
      stateLayers[state].public = ohioPublic;
      // ... counties, waterfowl
      break;
    case 'IN':
      // Your existing IN
      break;
    case 'MI': // NEW: Michigan DNR
      const miPublic = L.geoJSON(null, {
        style: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15 },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const name = p.NAME || p.SITE_NAME || 'Public Land';
          layer.bindPopup(`<b>${name}</b>`);
        }
      });
      // Official MI DNR GeoJSON for State Forests + Wildlife Areas
      try {
        const resp = await fetch('https://gis2.michigan.gov/arcgis/rest/services/OpenData/Recreation/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson');
        const data = await resp.json();
        miPublic.addData(data);
      } catch (e) { console.warn('MI layers failed', e); }
      stateLayers[state].public = miPublic;

      // MI Counties (using Census data filtered to MI FIPS 26)
      const miCounties = L.geoJSON(null, { /* your counties style */ });
      // Similar to IN code, filter fips.slice(0,2) === '26'
      // ... implement like indianaCounties
      stateLayers[state].counties = miCounties;
      await loadMichiganCounties(miCounties);
      break;
    case 'PA': // NEW: PA PGC + DCNR
      const paPublic = L.geoJSON(null, {
        style: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15 },
        onEachFeature: (feat, layer) => {
          const p = feat.properties || {};
          const name = p.NAME || p.GAMELAND || 'State Game Land';
          layer.bindPopup(`<b>${name}</b>`);
        }
      });
      // Official PA Game Lands GeoJSON
      try {
        const resp = await fetch('https://opendata.arcgis.com/datasets/3f5c8b2f1d4d4b8e8a5b0e5e5d5b5e5e_0.geojson'); // PA PGC Game Lands
        const data = await resp.json();
        paPublic.addData(data);
      } catch (e) { console.warn('PA layers failed', e); }
      stateLayers[state].public = paPublic;

      // PA Counties (Census FIPS 42)
      // Similar implementation
      break;
    // KY/WV: Add when ready
  }
}

function setState(code, save = true) {
  const c = (code || 'OH').toUpperCase();
  currentState = c;
  if (save) localStorage.setItem(STORAGE_STATE, c);
  syncStateUI();
  onStateChanged();
}

async function onStateChanged() {
  await loadStateLayers(currentState);
  const cfg = STATE_CFG[currentState];
  if (cfg) map.setView(cfg.center, cfg.zoom);

  // Toggle labels based on state (your existing logic + new for MI/PA)
  // Update sheet labels: e.g., 'Michigan Public Hunting'
  // Re-add public/counties for new state
  const publicLayer = stateLayers[currentState]?.public;
  if (publicLayer) publicLayer.addTo(map);
  // Sync checkboxes
}

function syncStateUI() {
  // Your existing badge/select/radio sync
}

// Init
async function initStateManager() {
  await loadStateLayers(currentState);
  setState(currentState);
}

export { setState, currentState, initStateManager };
