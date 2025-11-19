export function initUI() {
  const backdrop = document.getElementById('sheetBackdrop');

  document.querySelectorAll('.main-menu button, #bhhLayersBtnHandle').forEach(btn => {
    btn.addEventListener('click', () => {
      const sheetId = btn.id.replace('menu', '').replace('btn', '') + 'Sheet';
      const sheet = document.getElementById(sheetId || 'layersSheet');
      if (sheet) {
        sheet.classList.add('show');
        backdrop.classList.add('show');
      }
    });
  });

  backdrop.addEventListener('click', () => {
    document.querySelectorAll('.sheet.show').forEach(s => s.classList.remove('show'));
    backdrop.classList.remove('show');
  });

  document.querySelectorAll('.close-x').forEach(x => x.addEventListener('click', () => backdrop.click()));
}
