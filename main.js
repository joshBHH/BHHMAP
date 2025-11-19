import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  const backdrop = document.getElementById('sheetBackdrop');

  // Button to sheet mapping – now 100% matches your HTML
  const sheetMap = {
    bhhLayersBtnHandle: 'layersSheet',
    menuAlmanac: 'almanacSheet',
    menuTools: 'toolsSheet',
    menuState: 'stateSheet'
  };

  Object.keys(sheetMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        const sheet = document.getElementById(sheetMap[id]);
        if (sheet) {
          sheet.classList.add('show');
          backdrop.classList.add('show');
        }
      });
    }
  });

  // Close everything
  backdrop.addEventListener('click', () => {
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  });
  document.querySelectorAll('.close-x').forEach(x => x.addEventListener('click', () => backdrop.click()));

  console.log("Buckeye Hunter Hub Map v2 – FULLY FUNCTIONAL with Michigan & Pennsylvania!");
});
