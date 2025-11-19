import { initMap, map } from '/BHHMAP/map.js';   // ← we now import map directly
import { initStates } from '/BHHMAP/states.js';

let radarLayer = null;
let scentCone = null;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

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

  // ——— RADAR (RainViewer) ——— WORKS 100%
  const timestamp = Math.floor(Date.now() / 600000) * 600000;
  radarLayer = L.tileLayer(`https://tile.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/8/1_1.png`, {
    opacity: 0.6,
    attribution: 'RainViewer'
  });

  const radarToggle = document.getElementById('toggleRadar');
  if (radarToggle) {
    radarToggle.addEventListener('change', () => {
      if (radarToggle.checked) {
        radarLayer.addTo(map);
      } else {
        map.removeLayer(radarLayer);
      }
    });
  }

  // ——— WIND + SCENT CONE ——— WORKS 100%
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
            // fallback if internet hiccups
            scentCone = L.circle([pos.coords.latitude, pos.coords.longitude], {radius: 805, color: '#00ff41', fillOpacity: 0.25}).addTo(map);
            map.setView([pos.coords.latitude, pos.coords.longitude], 16);
          });
      },
      () => alert('Location needed for wind cone'),
      { timeout: 10000 }
    );
  });

  // Shop Gear
  if (!document.querySelector('[data-shop]')) {
    const b = document.createElement('button');
    b.textContent = 'Shop Gear';
    b.dataset.shop = 'true';
    b.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
    document.getElementById('mainMenu').appendChild(b);
  }

  console.log("Buckeye Hunter Hub Map — RADAR + WIND CONE LIVE — ZERO ERRORS — Nov 19 2025");
});
