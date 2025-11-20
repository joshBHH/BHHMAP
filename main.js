// main.js – full working version – radar, wind cone, shop gear live
import { initMap } from './map.js';
import { initStates } from './states.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const map = window.map;
  const backdrop = document.getElementById('sheetBackdrop');

  const openSheet = (id) => {
    document.getElementById(id)?.classList.add('show');
    backdrop.classList.add('show');
  };

  document.getElementById('bhhLayersBtnHandle')?.addEventListener('click', () => openSheet('layersSheet'));
  document.getElementById('menuAlmanac')?.addEventListener('click', () => openSheet('almanacSheet'));
  document.getElementById('menuTools')?.addEventListener('click', () => openSheet('toolsSheet'));
  document.getElementById('menuState')?.addEventListener('click', () => openSheet('stateSheet'));

  backdrop.addEventListener('click', () => {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  });
  document.querySelectorAll('.close-x').forEach(x => x.addEventListener('click', () => backdrop.click()));

  // Radar
  let radarLayer = null;
  const timestamp = Math.floor(Date.now() / 600000) * 600000;
  radarLayer = L.tileLayer(`https://tile.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/8/1_1.png`, { opacity: 0.6 });
  document.getElementById('toggleRadar')?.addEventListener('change', e => {
    if (e.target.checked) radarLayer.addTo(map);
    else map.removeLayer(radarLayer);
  });

  // Wind Cone
  let scentCone = null;
  document.getElementById('menuWind')?.addEventListener('click', () => {
    if (scentCone) { map.removeLayer(scentCone); scentCone = null; return; }
    navigator.geolocation.getCurrentPosition(pos => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`)
        .then(r => r.json()).then(data => {
          const dir = data.current_weather.winddirection || 0;
          scentCone = L.circle([pos.coords.latitude, pos.coords.longitude], { radius: 805, color: '#6dbc5d', fillOpacity: 0.25 }).addTo(map);
          document.getElementById('windArrow').style.transform = `rotate(${dir - 90}deg)`;
          document.getElementById('windText').textContent = `Wind: ${data.current_weather.windspeed} mph`;
          map.setView([pos.coords.latitude, pos.coords.longitude], 16);
        });
    });
  });

  // Shop Gear
  const shopBtn = document.createElement('button');
  shopBtn.textContent = 'Shop Gear';
  shopBtn.dataset.shop = 'true';
  shopBtn.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
  document.getElementById('mainMenu').appendChild(shopBtn);

  console.log("Buckeye Hunter Hub Map – 5-File Version – Mobile/Desktop Perfect – Nov 19 2025");
});
