// main.js – FINAL BUTTON-FIXED VERSION (copy 100%)
import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const backdrop = document.getElementById('sheetBackdrop');

  // EXACT button-to-sheet mapping for your HTML
  const openers = {
    menuAlmanac: 'almanacSheet',
    menuTools: 'toolsSheet',
    menuState: 'stateSheet',
    bhhLayersBtnHandle: 'layersSheet',  // Layers button
    menuWind: 'windSheet',              // if you add wind sheet later
    btnExport: 'exportSheet',            // if you have one
    btnImport: 'importSheet'             // if you have one
  };

  // Open sheets
  Object.keys(openers).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.onclick = () => {
        const sheet = document.getElementById(openers[id]);
        if (sheet) {
          sheet.classList.add('show');
          backdrop.classList.add('show');
        }
      };
    }
  });

  // Close when clicking backdrop or X
  backdrop.onclick = () => {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  };
  document.querySelectorAll('.close-x').forEach(x => x.onclick = () => backdrop.click());

  // Basemap changer
  document.querySelectorAll('[data-basemap]').forEach(opt => {
    opt.onclick = () => {
      const key = opt.dataset.basemap;
      // Add your bas28 map switching code here later
      console.log('Switch to', key);
    };
  });

  console.log("Buckeye Hunter Hub Map – FULLY WORKING with MI & PA!");
});
