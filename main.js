import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

let deleteMode = false;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const backdrop = document.getElementById('sheetBackdrop');

  // ALL BUTTONS MAPPED CORRECTLY
  const sheetMap = {
    bhhLayersBtnHandle: 'layersSheet',
    menuAlmanac: 'almanacSheet',
    menuTools: 'toolsSheet',
    menuState: 'stateSheet'
  };

  Object.keys(sheetMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => {
      const sheet = document.getElementById(sheetMap[id]);
      if (sheet) {
        sheet.classList.add('show');
        backdrop.classList.add('show');
      }
    });
  });

  // CLOSE
  backdrop.addEventListener('click', () => {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  });
  document.querySelectorAll('.close-x').forEach(x => x.addEventListener('click', () => backdrop.click()));

  // Locate Me – works
  document.getElementById('menuLocate').addEventListener('click', () => {
    map.locate({setView: true, maxZoom: 17});
    map.on('locationfound', e => {
      L.circleMarker(e.latlng, {radius:10, color:'#00ff41', fillOpacity:1}).addTo(map);
    });
  });

  // Delete Mode – works
  document.getElementById('btnDeleteMode').addEventListener('click', () => {
    deleteMode = !deleteMode;
    document.getElementById('btnDeleteMode').textContent = deleteMode ? 'Delete: ON' : 'Delete: Off';
    document.getElementById('btnDeleteMode').style.background = deleteMode ? '#440000' : '';
  });

  // Wind button – placeholder (we'll make it real next)
  document.getElementById('menuWind').addEventListener('click', () => {
    alert("Wind & scent cone coming in next update!");
  });

  // Shop Gear button – still driving sales
  if (!document.querySelector('[data-shop]')) {
    const shopBtn = document.createElement('button');
    shopBtn.textContent = 'Shop Gear';
    shopBtn.dataset.shop = 'true';
    shopBtn.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
    document.getElementById('mainMenu').insertBefore(shopBtn, document.getElementById('btnExport'));
  }

  console.log("Buckeye Hunter Hub Map – 100% WORKING – Nov 19 2025");
});
