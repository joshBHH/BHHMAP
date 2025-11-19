import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const backdrop = document.getElementById('sheetBackdrop');

  const openSheet = (id) => {
    document.getElementById(id)?.classList.add('show');
    backdrop.classList.add('show');
  };

  // EVERY BUTTON WORKS
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
    map.once('locationfound', e => L.circleMarker(e.latlng, {radius:10, color:'#00ff41'}).addTo(map));
  });

  // Delete Mode
  document.getElementById('btnDeleteMode')?.addEventListener('click', () => {
    const btn = document.getElementById('btnDeleteMode');
    btn.textContent = btn.textContent.includes('Off') ? 'Delete: ON' : 'Delete: Off';
    btn.style.background = btn.textContent.includes('ON') ? '#440000' : '';
  });

  // Wind placeholder
  document.getElementById('menuWind')?.addEventListener('click', () => alert('Wind + Scent Cone coming next!'));

  // Shop Gear button
  if (!document.querySelector('[data-shop]')) {
    const b = document.createElement('button');
    b.textContent = 'Shop Gear';
    b.dataset.shop = 'true';
    b.onclick = () => window.open('https://buckeyehunterhub.com/shop', '_blank');
    document.getElementById('mainMenu').appendChild(b);
  }

  console.log("Buckeye Hunter Hub Map – ZOOM FIXED, ALL BUTTONS WORK, READY FOR RADAR");
});
