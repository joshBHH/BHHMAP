// main.js – FINAL WORKING VERSION
import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();

  // Simple sheet opener (replaces old ui.js)
  const backdrop = document.getElementById('sheetBackdrop');
  const sheets = document.querySelectorAll('.sheet');
  const openers = {
    menuAlmanac: 'almanacSheet',
    menuTools: 'toolsSheet',
    menuState: 'stateSheet',
    bhhLayersBtnHandle: 'layersSheet',
    menuWind: 'windSheet' // if you have one
  };

  Object.keys(openers).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = () => {
      document.getElementById(openers[id])?.classList.add('show');
      backdrop.classList.add('show');
    };
  });

  backdrop.onclick = () => {
    sheets.forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  };

  document.querySelectorAll('.close-x').forEach(x => x.onclick = () => backdrop.click());

  console.log("Buckeye Hunter Hub Map v2 LIVE – MI & PA ready!");
});
