import './state-manager.js'; // Loads states + layers
import './ui.js'; // All UI wiring (sheets, menu, etc.)
import './map-init.js'; // Core map setup
import './waypoints.js'; // Markers
import './track.js'; // Track recorder
import './wind.js'; // Wind + scent
import './hunt-score.js'; // Almanac/score
import './compass.js'; // Compass
import './export-import.js'; // Export/Import
import './info-panel.js'; // Field info draggable

// Init after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initApp(); // From map-init.js
});
