import { initMap } from '/BHHMAP/map.js';
import { initStates } from '/BHHMAP/states.js';
import { initUI } from '/BHHMAP/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStates();
  initUI();
});
