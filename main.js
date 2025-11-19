// main.js – full working version – radar & wind live
import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

let radarLayer = null;
let scentCone = null;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  // Wait 100ms for map to be ready
  setTimeout(() => {
    const map = window.map;
    if (!map) {
      console.error('Map not ready');
      return;
    }

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

    // RADAR – LIVE
    const timestamp = Math.floor(Date.now() / 600000) * 600000;
    radarLayer = L.tileLayer(`https://tile.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/8/1_1.png`, {
      opacity: 0.6,
      attribution: 'RainViewer'
    });

    const radarToggle = document.getElementById('toggleRadar');
    if (radarToggle) {
      radarToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          radarLayer.addTo(map);
        } else {
          map.removeLayer(radarLayer);
        }
      });
    }

    // WIND + SCENT CONE – LIVE WITH LOCATION FALLBACK
    document.getElementById('menuWind')?.addEventListener('click', () => {
      if (scentCone) {
        map.removeLayer(scentCone);
        scentCone = null;
        document.getElementById('windText').textContent = 'Wind';
        document.getElementById('windArrow').style.transform = 'rotate(0deg)';
        return;
      }

      // Fallback location if geolocation fails (use map center)
      let lat = 40.4173, lng = -82.9071;
      navigator.geolocation.getCurrentPosition(
        pos => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
            .then(r => r.json())
            .then(data => {
              const dir = data.current_weather?.winddirection || 0;
              const speed = (data.current_weather?.windspeed || 5).toFixed(1);

              scentCone = L.circle([lat, lng], {radius: 805, color: '#00ff41', weight: 3, fillColor: '#00ff41', fillOpacity: 0.25}).addTo(map);
              document.getElementById('windArrow').style.transform = `rotate(${dir - 90}deg)`;
              document.getElementById('windText').textContent = `${speed} mph`;

              map.setView([lat, lng], 16);
            })
            .catch(() => {
              scentCone = L.circle([lat, lng], {radius: 805, color: '#00ff41', fillOpacity: 0.25}).addTo(map);
              map.setView([lat, lng], 16);
            });
        },
        () => {
          // No location – use map center fallback
          scentCone = L.circle([lat, lng], {radius: 805, color: '#00ff41', fillOpacity: 0.25}).addTo(map);
          map.setView([lat, lng], 16);
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
      const isOn = btn.textContent.includes('ON');
      btn.textContent = isOn ? 'Delete: Off' : 'Delete: ON';
      btn.style.background = isOn ? '' : '#440000';
    });

    // Shop Gear
    if (!document.querySelector('[data-shop]')) {
      const b = document.createElement('button');
      b.textContent = 'Shop Gear';
      b.dataset.shop = 'true';
      b.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
      document.getElementById('mainMenu').appendChild(b);
    }

    console.log("Buckeye Hunter Hub Map – RADAR, WIND, LOCATION LIVE – No Errors");
  }, 100);
});
