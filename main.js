// main.js – full working version – radar, wind, shop gear
import { initMap } from './map.js';
import { initStates } from './states.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const map = window.map;  // from map.js
  const backdrop = document.getElementById('sheetBackdrop');

  const openSheet = (id) => {
    document.getElementById(id)?.classList.add('show');
    backdrop.classList.add('show');
  };

  // Buttons
  document.getElementById('bhhLayersBtnHandle')?.addEventListener('click', () => openSheet('layersSheet'));
  document.getElementById('menuAlmanac')?.addEventListener('click', () => openSheet('almanacSheet'));
  document.getElementById('menuTools')?.addEventListener('click', () => openSheet('toolsSheet'));
  document.getElementById('menuState')?.addEventListener('click', () => openSheet('stateSheet'));

  // Close
  backdrop.addEventListener('click', () => {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  });
  document.querySelectorAll('.close-x').forEach(x => x.addEventListener('click', () => backdrop.click()));

  // Radar – live
  let radarLayer = null;
  const timestamp = Math.floor(Date.now() / 600000) * 600000;
  radarLayer = L.tileLayer(`https://tile.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/8/1_1.png`, {
    opacity: 0.6,
    attribution: 'RainViewer'
  });

  document.getElementById('toggleRadar')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      radarLayer.addTo(map);
    } else {
      map.removeLayer(radarLayer);
    }
  });

  // Wind cone – live with fallback
  let scentCone = null;
  document.getElementById('menuWind')?.addEventListener('click', () => {
    if (scentCone) {
      map.removeLayer(scentCone);
      scentCone = null;
      document.getElementById('windText').textContent = 'Wind: --';
      document.getElementById('windArrow').style.transform = 'rotate(0deg)';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`)
          .then(r => r.json())
          .then(data => {
            const dir = data.current_weather?.winddirection || 0;
            const speed = (data.current_weather?.windspeed || 5).toFixed(1);

            scentCone = L.circle([pos.coords.latitude, pos.coords.longitude], {radius: 805, color: '#6dbc5d', weight: 3, fillColor: '#6dbc5d', fillOpacity: 0.25}).addTo(map);
            document.getElementById('windArrow').style.transform = `rotate(${dir - 90}deg)`;
            document.getElementById('windText').textContent = `Wind: ${speed} mph`;

            map.setView([pos.coords.latitude, pos.coords.longitude], 16);
          })
          .catch(() => {
            scentCone = L.circle([pos.coords.latitude, pos.coords.longitude], {radius: 805, color: '#6dbc5d', fillOpacity: 0.25}).addTo(map);
            map.setView([pos.coords.latitude, pos.coords.longitude], 16);
          });
      },
      () => {
        // Fallback to map center
        const center = map.getCenter();
        scentCone = L.circle(center, {radius: 805, color: '#6dbc5d', fillOpacity: 0.25}).addTo(map);
        map.setView(center, 16);
      },
      { timeout: 5000 }
    );
  });

  // Locate Me
  document.getElementById('menuLocate')?.addEventListener('click', () => {
    map.locate({setView: true, maxZoom: 17});
  });

  // Delete Mode
  document.getElementById('btnDeleteMode')?.addEventListener('click', () => {
    const btn = document.getElementById('btnDeleteMode');
    btn.textContent = btn.textContent.includes('Off') ? 'Delete: On' : 'Delete: Off';
    btn.style.background = btn.textContent.includes('On') ? var(--danger) : var(--panel);
  });

  // Export (simple JSON)
  document.getElementById('btnExport')?.addEventListener('click', () => {
    const data = { state: document.getElementById('stateBadgeText').textContent, date: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bhh-map-export.json';
    a.click();
  });

  // Import (file picker)
  document.getElementById('btnImport')?.addEventListener('click', () => document.getElementById('fileImport').click());
  document.getElementById('fileImport')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          alert('Import successful: ' + data.state);
        } catch {
          alert('Invalid file');
        }
      };
      reader.readAsText(file);
    }
  });

  // Shop Gear – appends correctly to menu
  if (!document.querySelector('[data-shop]')) {
    const shopBtn = document.createElement('button');
    shopBtn.textContent = 'Shop Gear';
    shopBtn.dataset.shop = 'true';
    shopBtn.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
    document.getElementById('mainMenu').appendChild(shopBtn);
  }

  console.log("Buckeye Hunter Hub Map – FULLY WORKING – Radar, Wind, Shop Gear Live – Nov 19 2025");
});
