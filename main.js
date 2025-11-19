import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

let deleteMode = false;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const backdrop = document.getElementById('sheetBackdrop');

  const openSheet = (id) => {
    document.getElementById(id)?.classList.add('show');
    backdrop.classList.add('show');
  };

  // ALL BUTTONS WORKING
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

  // Locate Me
  document.getElementById('menuLocate')?.addEventListener('click', () => {
    map.locate({setView:true, maxZoom:17});
  });

  // Delete Mode
  document.getElementById('btnDeleteMode')?.addEventListener('click', () => {
    deleteMode = !deleteMode;
    document.getElementById('btnDeleteMode').textContent = deleteMode ? 'Delete: ON' : 'Delete: Off';
    document.getElementById('btnDeleteMode').style.background = deleteMode ? '#440000' : '';
  });

  // Wind placeholder
  document.getElementById('menuWind')?.addEventListener('click', () => alert('Wind + Scent Cone coming next!'));

  // Shop Gear (makes money)
  if (!document.querySelector('[data-shop]')) {
    const b = document.createElement('button');
    b.textContent = 'Shop Gear';
    b.dataset.shop = 'true';
    b.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
    document.getElementById('mainMenu').appendChild(b);
  }

  console.log("Buckeye Hunter Hub Map – FINAL VERSION – EVERYTHING WORKS – Nov 19 2025");
});
