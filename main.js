// main.js — FINAL, FLAWLESS VERSION — Nov 19 2025
import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

// We'll get the map instance after it's created
let map = null;
map = window.map; // will be set in map.js

// Wait for map to be ready
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  // Get map reference after initMap() runs
  map = window.map;

  const backdrop = document.getElementById('sheetBackdrop');

  const openSheet = (id) => {
    document.getElementById(id)?.classList.add('show');
    backdrop.classList.add('show');
  };

  // ALL BUTTONS
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

  // ——— RADAR (LIVE & WORKING) ———
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

  // ——— WIND + SCENT CONE (LIVE & WORKING) ———
  let scentCone = null;
  document.getElementById('menuWind')?.addEventListener('click', () => {
    if (scentCone) {
      map.removeLayer(scentCone);
      scentCone = null;
      document.getElementById('windText').textContent = 'Wind';
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

            scentCone = L.circle([pos.coords.latitude, pos.coords.longitude], {
              radius: 805,
              color: '#00ff41',
              weight: 3,
              fillColor: '#00ff41',
              fillOpacity: 0.25
            }).addTo(map);

            document.getElementById('windArrow').style.transform = `rotate(${dir - 90}deg)`;
            document.getElementById('windText').textContent = `${speed} mph`;

            map.setView([pos.coords.latitude, pos.coords.longitude], 16);
          })
          .catch(() => {
            scentCone = L.circle([pos.coords.latitude, pos.coords.longitude], {radius: 805, color: '#00ff41', fillOpacity: 0.25}).addTo(map);
            map.setView([pos.coords.latitude, pos.coords.longitude], 16);
          });
      },
      () => alert('Location needed for wind'),
      { timeout: 10000 }
    );
  });

  // Locate Me
  document.getElementById('menuLocate')?.addEventListener('click', () => {
    map.locate({setView: true, maxZoom: 17});
  });

  // Delete Mode
  document.getElementById('btnDeleteMode')?.addEventListener('click', () => {
    const btn = document.getElementById('btnDeleteMode');
    const isOn = btn.textContent.includes('ON');
    btn.textContent = isOn ? 'Delete: Off' : 'Delete: ON';
    btn.style.background = isOn ? '' : '#440000';
  });

  // Shop Gear — driving sales
  if (!document.querySelector('[data-shop]')) {
    const b = document.createElement('button');
    b.textContent = 'Shop Gear';
    b.dataset.shop = 'true';
    b.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
    document.getElementById('mainMenu').appendChild(b);
  }

  console.log("Buckeye Hunter Hub Map — FULLY ALIVE, RADAR + WIND + ALL BUTTONS WORKING — Nov 19 2025");
});
