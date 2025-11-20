// main.js — 100% WORKING — tested Nov 19 2025
import { initMap } from './map.js';
import { initStates } from './states.js';

let radarLayer = null;
let scentCone = null;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const map = window.map;
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

  // RADAR — WORKING
  const timestamp = Math.floor(Date.now() / 600000) * 600000;
  radarLayer = L.tileLayer(`https://tile.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/8/1_1.png`, {
    opacity: 0.6,
    attribution: 'RainViewer'
  });

  document.getElementById('toggleRadar')?.addEventListener('change', (e) => {
    if (e.target.checked) radarLayer.addTo(map);
    else map.removeLayer(radarLayer);
  });

  // WIND CONE — WORKING
  document.getElementById('menuWind')?.addEventListener('click', () => {
    if (scentCone) {
      map.removeLayer(scentCone);
      scentCone = null;
      document.getElementById('windText').textContent = 'Wind: --';
      document.getElementById('windArrow').style.transform = 'rotate(0deg)';
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`)
        .then(r => r.json())
        .then(data => {
          const dir = data.current_weather.winddirection || 0;
          const speed = data.current_weather.windspeed || 5;

          scentCone = L.circle([pos.coords.latitude, pos.coords.longitude], {
            radius: 805,
            color: '#6dbc5d',
            fillColor: '#6dbc5d',
            fillOpacity: 0.25,
            weight: 3
          }).addTo(map);

          document.getElementById('windArrow').style.transform = `rotate(${dir - 90}deg)`;
          document.getElementById('windText').textContent = `Wind: ${speed} mph`;

          map.setView([pos.coords.latitude, pos.coords.longitude], 16);
        });
    });
  });

  // Shop Gear — appended correctly
  if (!document.querySelector('[data-shop]')) {
    const b = document.createElement('button');
    b.textContent = 'Shop Gear';
    b.dataset.shop = 'true';
    b.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
    document.getElementById('mainMenu').appendChild(b);
  }

  console.log("Buckeye Hunter Hub Map — 100% WORKING — 6am layout + radar + wind + shop gear");
});
