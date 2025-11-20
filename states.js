let currentState = localStorage.getItem('bhh_state_code') || 'OH';
const STATES = { OH: { name: 'Ohio', center: [40.4173, -82.9071], zoom: 7 }, IN: { name: 'Indiana', center: [39.8, -86.3], zoom: 7 }, MI: { name: 'Michigan', center: [44.3, -85.6], zoom: 6 }, PA: { name: 'Pennsylvania', center: [40.9, -77.8], zoom: 7 } };

export function initStates() {
  document.getElementById('stateBadgeText').textContent = STATES[currentState].name;
  window.map.setView(STATES[currentState].center, STATES[currentState].zoom);

  document.querySelectorAll('input[name="bhhState"]').forEach(r => r.addEventListener('change', e => {
    currentState = e.target.value;
    localStorage.setItem('bhh_state_code', currentState);
    document.getElementById('stateBadgeText').textContent = STATES[currentState].name;
    window.map.setView(STATES[currentState].center, STATES[currentState].zoom);
  }));
}
