import { initMap, map } from './map.js';
import { initUI, openSheet, closeSheets } from './ui.js';
import { initStateManager, setState } from './states.js';
import { initWaypoints } from './waypoints.js';
import { initTrack } from './track.js';
import { initWind } from './wind.js';
import { initExportImport } from './export-import.js';

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initStateManager();
  initUI();
  initWaypoints();
  initTrack();
  initWind();
  initExportImport();
});
