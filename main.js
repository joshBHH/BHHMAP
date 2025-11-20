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

  document.getElementById('bhhLayersBtnHandle')?.addEventListener('click', () => openSheet('layersSheet'));
  document.getElementById('menuState')?.addEventListener('click', () => openSheet('stateSheet'));

  backdrop.addEventListener('click', () => {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  });
  document.querySelectorAll('.close-x').forEach(x => x.addEventListener('click', () => backdrop.click()));

  // Radar
  const ts = Math.floor(Date.now() / 600000) * 600000;
  radarLayer = L.tileLayer(`https://tile.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/8/1_1.png`, { opacity: 0.6 });
  document.getElementById('toggleRadar')?.addEventListener('change', e => e.target.checked ? radarLayer.addTo(map) : map.removeLayer(radarLayer));

  // Wind
  document.getElementById('menuWind')?.addEventListener('click', () => {
    if (scentCone) { map.removeLayer(scentCone); scentCone = null; return; }
    navigator.geolocation.getCurrentPosition(pos => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=\( {pos.coords.latitude}&longitude= \){pos.coords.longitude}&current_weather=true`)
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

  console.log("Back to your 5am version – perfect menu – with improvements");
});
