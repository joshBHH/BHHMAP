/*******************
 * MAP & BASELAYERS
 *******************/
// [BHH: MAP INIT START]
const map = L.map('map').setView([40.4173, -82.9071], 7);

// MapTiler basemaps (replace key if needed)
const basic = L.tileLayer(
  'https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3',
  { attribution: '&copy; MapTiler & OpenStreetMap contributors' }
);
const satellite = L.tileLayer(
  'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3',
  { attribution: '&copy; MapTiler' }
);
const topo = L.tileLayer(
  'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3',
  { attribution: '&copy; MapTiler & OpenStreetMap contributors' }
);
const hybrid = L.tileLayer(
  'https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3',
  { attribution: '&copy; MapTiler' }
);

// Default to Hybrid on first load; then respect saved choice
hybrid.addTo(map);
const baseByKey = { basic, satellite, topo, hybrid };
const STORAGE_BASE = 'ui_basemap_key';

function setBasemap(key){
  Object.values(baseByKey).forEach(l => map.removeLayer(l));
  (baseByKey[key] || hybrid).addTo(map);
  localStorage.setItem(STORAGE_BASE, key);
}

(function restoreBasemap(){
  const k = localStorage.getItem(STORAGE_BASE);
  if (k && baseByKey[k]) setBasemap(k);
})();
// [BHH: MAP INIT END]


/*******************
 * DRAWING LAYERS (toolbar removed, storage intact)
 *******************/
// [BHH: DRAW – STORAGE START]
const drawnItems = new L.FeatureGroup().addTo(map);
const segmentLabelsGroup = L.layerGroup().addTo(map); // used by distance labels
const STORAGE_DRAW = 'bhh_drawings_v6';

// helper: detect shape type
function featureTypeFromLayer(l){
  if (l instanceof L.Circle) return 'circle';
  if (l instanceof L.Rectangle) return 'rectangle';
  if (l instanceof L.Polygon && !(l instanceof L.Rectangle)) return 'polygon';
  if (l instanceof L.Polyline && !(l instanceof L.Polygon)) return 'polyline';
  return 'shape';
}

function defaultShapeName(type){
  const base = {
    polyline: 'Line',
    polygon:  'Area',
    rectangle:'Plot',
    circle:   'Circle',
    shape:    'Shape'
  }[type] || 'Shape';

  let n = 1;
  drawnItems.eachLayer(l => {
    if (featureTypeFromLayer(l) === type) n++;
  });
  return `${base} ${n}`;
}

// save/restore drawings (circles handled separately)
function saveDraw(){
  const geojson = { type:'FeatureCollection', features:[] };
  const circles = [];

  drawnItems.eachLayer(l => {
    const type = featureTypeFromLayer(l);
    if (type === 'circle') {
      const c = l.getLatLng();
      circles.push({
        lat: c.lat,
        lng: c.lng,
        radius: l.getRadius(),
        properties: {
          name: l._bhhName || defaultShapeName('circle'),
          shapeType:'circle'
        }
      });
    } else {
      const f = l.toGeoJSON();
      f.properties = Object.assign({}, f.properties || {}, {
        name: l._bhhName || defaultShapeName(type),
        shapeType: type
      });
      geojson.features.push(f);
    }
  });

  const bundle = { geojson, circles };
  localStorage.setItem(STORAGE_DRAW, JSON.stringify(bundle));
}

function restoreDraw(){
  const raw = localStorage.getItem(STORAGE_DRAW);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if (data && data.geojson) {
      L.geoJSON(data.geojson, {
        onEachFeature:(feat, layer) => {
          layer._bhhName =
            (feat.properties && feat.properties.name) ||
            defaultShapeName(featureTypeFromLayer(layer));
          drawnItems.addLayer(layer);

          if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            labelPolylineSegments(layer);
            updatePolylineTotalLabel(layer);
          }
        }
      });

      (data.circles || []).forEach(c => {
        const layer = L.circle([c.lat, c.lng], { radius:c.radius });
        layer._bhhName =
          (c.properties && c.properties.name) ||
          defaultShapeName('circle');
        drawnItems.addLayer(layer);
      });

    } else if (data.type === 'FeatureCollection') { // legacy
      L.geoJSON(data, {
        onEachFeature:(_, layer) => {
          layer._bhhName = defaultShapeName(featureTypeFromLayer(layer));
          drawnItems.addLayer(layer);
          if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            labelPolylineSegments(layer);
            updatePolylineTotalLabel(layer);
          }
        }
      });
    }
  } catch(e) {
    console.warn('restore drawings failed', e);
  }
}
restoreDraw();

// distance labels for polylines
function fmtFeetMiles(m){
  const ft = m * 3.28084;
  if (m >= 1609.344) return (m / 1609.344).toFixed(2) + ' mi';
  return Math.round(ft) + ' ft';
}

function removeSegLabels(layer){
  if (layer._segLabels){
    layer._segLabels.forEach(lbl => segmentLabelsGroup.removeLayer(lbl));
    layer._segLabels = null;
  }
}

function removeTotalLabel(layer){
  if (layer._totalLabel){
    segmentLabelsGroup.removeLayer(layer._totalLabel);
    layer._totalLabel = null;
  }
}

function labelPolylineSegments(layer){
  removeSegLabels(layer);
  const latlngs = layer.getLatLngs();
  const pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
  const labels = [];

  for (let i = 1; i < pts.length; i++){
    const a = pts[i-1], b = pts[i];
    const d = map.distance(a, b);
    const mid = L.latLng(
      (a.lat + b.lat) / 2,
      (a.lng + b.lng) / 2
    );

    const marker = L.marker(mid, {
      interactive:false,
      icon: L.divIcon({
        className:'',
        html:`<div class="seglabel">${fmtFeetMiles(d)}</div>`
      })
    });

    marker.addTo(segmentLabelsGroup);
    labels.push(marker);
  }

  layer._segLabels = labels;
}

function polylineTotalDistance(layer){
  const latlngs = layer.getLatLngs();
  const pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
  let d = 0;
  for (let i = 1; i < pts.length; i++){
    d += map.distance(pts[i-1], pts[i]);
  }
  return d;
}

function updatePolylineTotalLabel(layer){
  removeTotalLabel(layer);
  const latlngs = layer.getLatLngs();
  const pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
  if (pts.length < 2) return;

  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const anchor = L.latLng(
    (a.lat * 0.3 + b.lat * 0.7),
    (a.lng * 0.3 + b.lng * 0.7)
  );
  const total = fmtFeetMiles(polylineTotalDistance(layer));

  const marker = L.marker(anchor, {
    interactive:false,
    icon: L.divIcon({
      className:'',
      html:`<div class="seglabel"><b>Total:</b> ${total}</div>`
    })
  });

  marker.addTo(segmentLabelsGroup);
  layer._totalLabel = marker;
}

function relabelPolyline(layer){
  labelPolylineSegments(layer);
}
// [BHH: DRAW – STORAGE END]


/*******************
 * OVERLAYS: Ohio Public Hunting
 *******************/
// [BHH: OVERLAYS – OHIO PUBLIC START]
const ohioPublic = L.geoJSON(null, {
  style:{ color:'#8b5cf6', weight:2, fillOpacity:0.15 },
  onEachFeature:(feat, layer)=>{
    const p = feat && feat.properties ? feat.properties : {};
    const preferred = [
      'NAME','AREA_NAME','UNIT_NAME','PARK_NAME','SITE_NAME',
      'COUNTY','ACRES','AREA_ACRES','OWNER','AGENCY','STATUS',
      'TYPE','ACCESS','SEASON'
    ];
    const headerKey =
      preferred.find(k => k in p) ||
      Object.keys(p)[0];
    const name = headerKey ? String(p[headerKey]) : 'Public Hunting Area';

    const keysOrdered = [
      ...new Set([
        ...preferred.filter(k => k in p),
        ...Object.keys(p)
      ])
    ].slice(0,12);

    const rows = keysOrdered.map(k =>
      `<div><span style="color:#a3b7a6">${k}:</span> ${String(p[k])}</div>`
    ).join('');

    layer.bindPopup(
      `<b>${name}</b><div style="margin-top:6px">${rows}</div>`
    );

    layer.on('mouseover', () => layer.setStyle({weight:3}));
    layer.on('mouseout',  () => layer.setStyle({weight:2}));
  }
});

async function loadOhioPublic(){
  try {
    const localResp = await fetch('ohio_public_hunting.geojson', {cache:'reload'});
    if (localResp.ok){
      const localJson = await localResp.json();
      ohioPublic.addData(localJson);
      return;
    }
  } catch(e){
    /* ignore local fail */
  }

  try {
    const odnrResp = await fetch(
      'https://gis2.ohiodnr.gov/ArcGIS/rest/services/OIT_Services/DNR_Fed_Lands_Nav_Base/MapServer/2/query?where=1%3D1&outFields=*&outSR=4326&f=geojson'
    );
    const odnrJson = await odnrResp.json();
    ohioPublic.addData(odnrJson);
  } catch(err){
    console.warn('ODNR public layer fetch failed', err);
  }
}
loadOhioPublic();
// [BHH: OVERLAYS – OHIO PUBLIC END]


/*******************
 * OVERLAYS: Ohio Counties + Labels
 *******************/
// [BHH: OVERLAYS – COUNTIES START]
const ohioCounties = L.geoJSON(null, {
  style: { color:'#94a3b8', weight:1, fill:false, opacity:0.9 },
  onEachFeature: (feat, layer) => {
    const name =
      (feat.properties &&
       (feat.properties.County_Name || feat.properties.COUNTY_NAME)) ||
      'County';

    layer.on('mouseover', () => layer.setStyle({ weight:2 }));
    layer.on('mouseout',  () => layer.setStyle({ weight:1 }));
    layer._countyName = String(name);
  }
});

const countyLabels = L.layerGroup();

function labelFontForZoom(z){
  if (z >= 11) return 14;
  if (z >= 9)  return 12;
  if (z >= 7)  return 10;
  return 0;
}

function refreshCountyLabels(){
  const fs = labelFontForZoom(map.getZoom());
  countyLabels.eachLayer(m => {
    const el = m.getElement();
    if (!el) return;
    if (fs === 0){
      el.style.display = 'none';
    } else {
      el.style.display = 'block';
      el.style.fontSize = fs + 'px';
    }
  });
}

function buildCountyLabels(){
  countyLabels.clearLayers();
  ohioCounties.eachLayer(layer => {
    try {
      const center = layer.getBounds().getCenter();
      const name = layer._countyName || 'County';
      const lbl = L.marker(center, {
        interactive:false,
        pane:'tooltipPane',
        icon: L.divIcon({
          className:'county-label',
          html: name
        })
      });
      countyLabels.addLayer(lbl);
    } catch(_){}
  });

  refreshCountyLabels();
  if (map.hasLayer(ohioCounties) && !map.hasLayer(countyLabels)){
    countyLabels.addTo(map);
  }
}

async function loadOhioCounties(){
  try {
    const url =
      'https://gis.dot.state.oh.us/arcgis/rest/services/Basemap/ODOT_Basemap/MapServer/165/query?where=1%3D1&outFields=County_Name&outSR=4326&f=geojson';
    const r = await fetch(url);
    const j = await r.json();
    ohioCounties.addData(j);
    buildCountyLabels();
  } catch(e){
    console.warn('Counties layer fetch failed', e);
  }
}
loadOhioCounties();

map.on('zoomend', refreshCountyLabels);
map.on('overlayadd', (e)=>{
  if (e.layer === ohioCounties){
    countyLabels.addTo(map);
    refreshCountyLabels();
  }
});
map.on('overlayremove', (e)=>{
  if (e.layer === ohioCounties){
    map.removeLayer(countyLabels);
  }
});
// [BHH: OVERLAYS – COUNTIES END]


/*******************
 * OVERLAYS: Indiana Counties + Labels
 *******************/
// [BHH: OVERLAYS – IN COUNTIES START]
const indianaCounties = L.geoJSON(null, {
  style: { color:'#94a3b8', weight:1, fill:false, opacity:0.9 },
  onEachFeature: (feat, layer) => {
    const name =
      (feat.properties &&
       (feat.properties.NAME ||
        feat.properties.County ||
        feat.properties.COUNTY)) ||
      'County';

    layer.on('mouseover', () => layer.setStyle({ weight:2 }));
    layer.on('mouseout',  () => layer.setStyle({ weight:1 }));
    layer._countyName = String(name);
  }
});

const indianaCountyLabels = L.layerGroup();

function labelFontForZoomIN(z){
  if (z >= 11) return 14;
  if (z >= 9)  return 12;
  if (z >= 7)  return 10;
  return 0;
}

function refreshIndianaCountyLabels(){
  const fs = labelFontForZoomIN(map.getZoom());
  indianaCountyLabels.eachLayer(m => {
    const el = m.getElement();
    if (!el) return;
    if (fs === 0){
      el.style.display = 'none';
    } else {
      el.style.display = 'block';
      el.style.fontSize = fs + 'px';
    }
  });
}

function buildIndianaCountyLabels(){
  indianaCountyLabels.clearLayers();
  indianaCounties.eachLayer(layer => {
    try {
      const center = layer.getBounds().getCenter();
      const name = layer._countyName || 'County';
      const lbl = L.marker(center, {
        interactive:false,
        pane:'tooltipPane',
        icon: L.divIcon({
          className:'county-label',
          html: name
        })
      });
      indianaCountyLabels.addLayer(lbl);
    } catch(_){}
  });

  refreshIndianaCountyLabels();
  if (map.hasLayer(indianaCounties) && !map.hasLayer(indianaCountyLabels)){
    indianaCountyLabels.addTo(map);
  }
}

async function loadIndianaCounties(){
  // Try US Census TIGER/Cartographic counties for Indiana (GeoJSON)
  const primary =
    'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';
  try {
    const r = await fetch(primary, { cache:'reload' });
    if (r.ok){
      const j = await r.json();
      const onlyIN = {
        type:'FeatureCollection',
        features:(j.features || []).filter(f => {
          const fips = (f.id || '').toString();
          return fips.slice(0,2) === '18';
        }).map(f => ({
          type:'Feature',
          geometry:f.geometry,
          properties:{
            NAME:(f.properties && f.properties.NAME) || 'County'
          }
        }))
      };

      if (onlyIN.features.length){
        indianaCounties.addData(onlyIN);
        buildIndianaCountyLabels();
        return;
      }
    }
  } catch(e){
    console.warn('Primary IN counties source failed', e);
  }

  // Fallback: ArcGIS USA_Counties filtered to Indiana
  try {
    const url =
      'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Counties/FeatureServer/0/query?where=STATE_NAME%3D%27Indiana%27&outFields=NAME&outSR=4326&f=geojson';
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    indianaCounties.addData(j);
    buildIndianaCountyLabels();
  } catch(e){
    console.error('Indiana counties layer fetch failed', e);
  }
}
loadIndianaCounties();

map.on('zoomend', refreshIndianaCountyLabels);
map.on('overlayadd',   (e)=>{
  if (e.layer === indianaCounties){
    indianaCountyLabels.addTo(map);
    refreshIndianaCountyLabels();
  }
});
map.on('overlayremove',(e)=>{
  if (e.layer === indianaCounties){
    indianaCountyLabels.clearLayers();
  }
});
// [BHH: OVERLAYS – IN COUNTIES END]


/*******************
 * OVERLAYS: Waterfowl Zones (ODNR polygons)
 *******************/
// [BHH: OVERLAYS – WATERFOWL ZONES START]
const waterfowlZones = L.geoJSON(null, {
  style: { color:'#22c55e', weight:2, fillOpacity:0.15 },
  onEachFeature: (feat, layer) => {
    const p = feat.properties || {};
    const name  = p.Zone_ || p.ZONE_NAME || 'Waterfowl Zone';
    const duck  = p.DuckSeason || p.DUCK_SEASON || '';
    const goose = p.GooseSeason || p.GOOSE_SEASON || '';

    const rows = [
      duck  ? `<div><span style="color:#a3b7a6">Duck:</span> ${duck}</div>`   : '',
      goose ? `<div><span style="color:#a3b7a6">Goose:</span> ${goose}</div>` : ''
    ].join('');

    layer.bindPopup(
      `<b>${name}</b>${
        rows ? `<div style="margin-top:6px">${rows}</div>` : ''
      }`
    );

    layer.on('mouseover', () => layer.setStyle({weight:3}));
    layer.on('mouseout',  () => layer.setStyle({weight:2}));
  }
});

async function loadWaterfowlZones(){
  try {
    const url =
      'https://gis2.ohiodnr.gov/ArcGIS/rest/services/DOW_Services/Hunting_Regulations/MapServer/2/query?where=1%3D1&outFields=*&outSR=4326&f=geojson';
    const r = await fetch(url);
    const j = await r.json();
    waterfowlZones.addData(j);
  } catch(e){
    console.warn('Waterfowl zones load failed', e);
  }
}
loadWaterfowlZones();
// [BHH: OVERLAYS – WATERFOWL ZONES END]


/*******************
 * OVERLAYS & BASEMAP: Sheet wiring
 *******************/
// [BHH: SHEET – BASEMAP & OVERLAYS START]
// Basemap radios
const radios = Array.from(document.querySelectorAll('input[name="basemap"]'));

function syncBaseRadio(){
  const k = localStorage.getItem(STORAGE_BASE) || 'hybrid';
  const r = radios.find(r => r.value === k);
  if (r) r.checked = true;
}

radios.forEach(r =>
  r.addEventListener('change', () => setBasemap(r.value))
);
syncBaseRadio();

// Overlay checkboxes
const ovlOhio      = document.getElementById('ovlOhio');
const ovlCounties  = document.getElementById('ovlCounties');
const ovlWaterfowl = document.getElementById('ovlWaterfowl');
const ovlDraw      = document.getElementById('ovlDraw');
const ovlMarks     = document.getElementById('ovlMarks');
const ovlTrack     = document.getElementById('ovlTrack');

// These layers get toggled by the sheet
function syncOverlayChecks(){
  ovlOhio.checked      = map.hasLayer(ohioPublic);
  ovlCounties.checked  =
    (currentState === 'IN')
      ? map.hasLayer(indianaCounties)
      : map.hasLayer(ohioCounties);
  ovlWaterfowl.checked = map.hasLayer(waterfowlZones);
  ovlDraw.checked      = map.hasLayer(drawnItems);
  ovlMarks.checked     = map.hasLayer(markersLayer);
  ovlTrack.checked     = map.hasLayer(trackLayer);
}

ovlOhio.onchange      =
  () => ovlOhio.checked
    ? ohioPublic.addTo(map)
    : map.removeLayer(ohioPublic);

ovlCounties.onchange  = () => {
  if (currentState === 'IN'){
    if (ovlCounties.checked){
      indianaCounties.addTo(map);
      indianaCountyLabels.addTo(map);
      refreshIndianaCountyLabels();
    } else {
      map.removeLayer(indianaCounties);
      map.removeLayer(indianaCountyLabels);
    }
  } else {
    if (ovlCounties.checked){
      ohioCounties.addTo(map);
      countyLabels.addTo(map);
      refreshCountyLabels();
    } else {
      map.removeLayer(ohioCounties);
      map.removeLayer(countyLabels);
    }
  }
};

ovlWaterfowl.onchange =
  () => ovlWaterfowl.checked
    ? waterfowlZones.addTo(map)
    : map.removeLayer(waterfowlZones);

ovlDraw.onchange      =
  () => ovlDraw.checked
    ? drawnItems.addTo(map)
    : map.removeLayer(drawnItems);
// ovlMarks & ovlTrack handlers wired further below

// Make entire .option row toggle the inner input
document.querySelectorAll('.sheet .option').forEach(opt => {
  opt.addEventListener('click', (ev) => {
    if (ev.target.tagName === 'SELECT' || ev.target.tagName === 'INPUT') return;
    const input = opt.querySelector('input');
    if (!input) return;

    if (input.type === 'radio'){
      input.checked = true;
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }
    if (input.type === 'checkbox'){
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }
  });
});
// [BHH: SHEET – BASEMAP & OVERLAYS END]


/*******************
 * MARKERS (WAYPOINTS) + PHOTO NOTES
 *******************/
// [BHH: WAYPOINTS – DATA START]
const markersLayer = L.featureGroup().addTo(map);
const STORAGE_MARK = 'bhh_markers_v4';
const IS_MOBILE = matchMedia('(max-width:640px)').matches;
const ICON_SZ = IS_MOBILE ? 28 : 32;
const FONT_SZ = IS_MOBILE ? 16 : 18;

function makeIcon(bg, emoji){
  return L.divIcon({
    className:'',
    html: `<div style="background:${bg};border:2px solid #333;border-radius:50%;width:${ICON_SZ}px;height:${ICON_SZ}px;display:flex;align-items:center;justify-content:center;font-size:${FONT_SZ}px;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4);">${emoji}</div>`,
    iconSize:[ICON_SZ, ICON_SZ],
    iconAnchor:[ICON_SZ/2, ICON_SZ],
    popupAnchor:[0, -ICON_SZ*0.9]
  });
}

const markerTypes = {
  stand:  {label:'Tree Stand',   emoji:'🎯', icon:makeIcon('#2563eb','🎯')},
  feeder: {label:'Feeder',       emoji:'🍽️', icon:makeIcon('#16a34a','🍽️')},
  camera: {label:'Trail Camera', emoji:'📷', icon:makeIcon('#111827','📷')},
  scrape: {label:'Scrape',       emoji:'🦌', icon:makeIcon('#6d28d9','🦌')},
  rub:    {label:'Rub',          emoji:'🪵', icon:makeIcon('#b45309','🪵')},
  water:  {label:'Water Source', emoji:'💧', icon:makeIcon('#0891b2','💧')}
};

let activeType = null;
let deleteMode = false;

function setActiveType(type){
  activeType = type;
  document.getElementById('map').classList.toggle('placing', !!type);
}

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function defaultName(type){
  const base = markerTypes[type]?.label || 'Marker';
  let n = 1;
  markersLayer.eachLayer(m => {
    if (m.options.type === type) n++;
  });
  return `${base} ${n}`;
}

function markerPopupHTML(m){
  const cfg = markerTypes[m.options.type] || {label:'Marker'};
  const img = m.options.photo
    ? `<div style="margin-top:6px"><img src="${m.options.photo}" alt="photo" style="max-width:160px;border-radius:8px;border:1px solid #203325"/></div>`
    : '';
  const notes = m.options.notes
    ? `<div class="tag" style="margin-top:6px">${m.options.notes.replace(/</g,'&lt;')}</div>`
    : '';
  return `
    <b>${m.options.name}</b>
    <div class="tag">${cfg.label}</div>
    ${img}${notes}
    <div style="margin-top:8px">
      <button class="del">Delete</button>
    </div>`;
}

function addMarker(latlng, type, name, id, notes, photo){
  const cfg = markerTypes[type] || {
    label:'Marker',
    emoji:'📍',
    icon:makeIcon('#555','📍')
  };

  const markerId   = id   || uid();
  const markerName = name || defaultName(type);

  const m = L.marker(latlng, {
    icon: cfg.icon,
    draggable:true,
    type,
    id: markerId,
    name: markerName,
    notes: notes || '',
    photo: photo || ''
  });

  const setPopup = () => m.bindPopup(markerPopupHTML(m), {autoPan:false});
  setPopup();

  m.on('dragend', saveMarkers);

  m.on('click', () => {
    if (deleteMode){
      markersLayer.removeLayer(m);
      saveMarkers();
      refreshWaypointsUI();
    }
  });

  m.on('popupopen', (e) => {
    const btn = e.popup.getElement().querySelector('button.del');
    if (btn){
      btn.addEventListener('click', () => {
        markersLayer.removeLayer(m);
        saveMarkers();
        refreshWaypointsUI();
      });
    }
  });

  markersLayer.addLayer(m);
  saveMarkers();
  return m;
}

function serializeMarkers(){
  const list = [];
  markersLayer.eachLayer(m => {
    const {lat, lng} = m.getLatLng();
    list.push({
      id:   m.options.id,
      name: m.options.name,
      type: m.options.type || 'marker',
      lat,
      lng,
      notes: m.options.notes || '',
      photo: m.options.photo || ''
    });
  });
  return list;
}

function deserializeMarkers(list){
  markersLayer.clearLayers();
  (list || []).forEach(m =>
    addMarker([m.lat, m.lng], m.type, m.name, m.id, m.notes, m.photo)
  );
}

function saveMarkers(){
  localStorage.setItem(STORAGE_MARK, JSON.stringify(serializeMarkers()));
}

(function restoreMarkers(){
  try {
    const raw = localStorage.getItem(STORAGE_MARK);
    if (raw) deserializeMarkers(JSON.parse(raw));
  } catch(e){}
})();

map.on('click', e => {
  if (!activeType) return;
  addMarker(e.latlng, activeType);
  setActiveType(null);
  refreshWaypointsUI();
});
// [BHH: WAYPOINTS – DATA END]


/*******************
 * TRACK RECORDER
 *******************/
// [BHH: TRACK START]
const trackLayer = L.polyline([], {
  color:'#22d3ee',
  weight:4,
  opacity:0.9
}).addTo(map);

const STORAGE_TRK = 'bhh_track_v1';
let trackPoints = []; // {lat,lng,t}
let watchId = null;
let startTime = null;
let lastPoint = null;

function loadTrack(){
  try {
    const raw = localStorage.getItem(STORAGE_TRK);
    if (raw){
      trackPoints = JSON.parse(raw) || [];
      trackLayer.setLatLngs(trackPoints.map(p => [p.lat, p.lng]));
    }
  } catch(e){}
  updateTrackStats();
}

function saveTrack(){
  localStorage.setItem(STORAGE_TRK, JSON.stringify(trackPoints));
  updateTrackStats();
}

function appendPoint(lat, lng, t){
  const pt = {lat, lng, t: t || Date.now()};
  if (lastPoint){
    const d = map.distance(
      [lastPoint.lat, lastPoint.lng],
      [lat,          lng]
    );
    if (d < 3) return;
  }
  trackPoints.push(pt);
  lastPoint = pt;
  trackLayer.addLatLng([lat, lng]);
  saveTrack();
}

function trackDistance(){
  let d = 0;
  for (let i = 1; i < trackPoints.length; i++){
    d += map.distance(
      [trackPoints[i-1].lat, trackPoints[i-1].lng],
      [trackPoints[i].lat,   trackPoints[i].lng]
    );
  }
  return d;
}

function updateTrackStats(){
  const pts  = trackPoints.length;
  const dist = trackDistance();

  const elPts   = document.getElementById('trkPts');
  const elDist  = document.getElementById('trkDist');
  const elDur   = document.getElementById('trkDur');
  const elpDist = document.getElementById('pTrkDist');
  const elpDur  = document.getElementById('pTrkDur');

  if (!elPts || !elDist || !elDur || !elpDist || !elpDur) return;

  elPts.textContent = pts;

  const distText = dist > 1609.344
    ? (dist / 1609.344).toFixed(2) + ' mi'
    : Math.round(dist * 3.28084) + ' ft';

  elDist.textContent  = distText;
  elpDist.textContent = distText;

  const durMs = startTime
    ? (Date.now() - startTime)
    : (trackPoints.length
        ? (trackPoints[trackPoints.length-1].t - trackPoints[0].t)
        : 0);

  const mm = Math.floor(durMs / 60000);
  const ss = (Math.floor(durMs / 1000) % 60).toString().padStart(2,'0');

  const durText = `${mm}:${ss}`;
  elDur.textContent  = durText;
  elpDur.textContent = durText;
}

function startTrack(){
  if (!navigator.geolocation){
    alert('Geolocation not supported');
    return;
  }
  if (watchId) return;

  document.getElementById('trkStatus').textContent   = 'Recording';
  document.getElementById('trkStartStop').textContent = 'Stop';
  startTime = Date.now();

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const {latitude, longitude} = pos.coords;
      appendPoint(latitude, longitude, Date.now());
      if (document.getElementById('trkFollow').checked){
        map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
      }
    },
    err => {
      console.warn('track error', err);
    },
    { enableHighAccuracy:true, maximumAge:5000 }
  );
}

function stopTrack(){
  if (!watchId) return;
  navigator.geolocation.clearWatch(watchId);
  watchId = null;
  document.getElementById('trkStatus').textContent    = 'Stopped';
  document.getElementById('trkStartStop').textContent = 'Start';
  updateTrackStats();
}

function clearTrack(){
  stopTrack();
  trackPoints = [];
  lastPoint   = null;
  trackLayer.setLatLngs([]);
  saveTrack();
}

function exportGPX(){
  if (!trackPoints.length){
    alert('No track to export');
    return;
  }

  const name =
    'BHH Track ' +
    new Date(trackPoints[0].t).toISOString().slice(0,10);

  const head =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="BuckeyeHunterHub" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${name}</name><trkseg>`;

  const seg = trackPoints.map(p =>
    `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.t).toISOString()}</time></trkpt>`
  ).join('');

  const tail = `</trkseg></trk></gpx>`;

  const blob = new Blob([head + seg + tail], {
    type:'application/gpx+xml'
  });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = name.replace(/\s+/g,'_') + '.gpx';
  a.click();
  URL.revokeObjectURL(url);
}

loadTrack();
// [BHH: TRACK END]


/*******************
 * WIND (live) + SCENT CONE
 *******************/
// [BHH: WIND & SCENT START]
const btnWind  = document.getElementById('menuWind');
const windText = document.getElementById('windText');

let currentWind = { fromDeg:null, speed:0 };
let lastGPS     = null;

function degToCardinal(d){
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(d / 45) % 8];
}

function updateWindUI(fromDeg, speed){
  const toDeg = (fromDeg + 180) % 360;

  const from = degToCardinal(fromDeg);
  const to   = degToCardinal(toDeg);

  windText.textContent =
    `Wind: ${from} → ${to}  ${Math.round(speed)} mph`;
}

async function fetchWindAt(lat, lng){
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('wind fetch failed');
  const j   = await r.json();
  const cur = j.current || j.current_weather || {};

  const speed = cur.wind_speed_10m ?? cur.windspeed ?? 0;
  const dir   = cur.wind_direction_10m ?? cur.winddirection ?? 0;

  currentWind = { fromDeg:dir, speed };
  updateWindUI(dir, speed);
  updateScentCone();
}

async function refreshWind(){
  try {
    const pos = await new Promise((res, rej) => {
      if (!navigator.geolocation) return rej('no geo');
      navigator.geolocation.getCurrentPosition(
        p => res(p),
        e => rej(e),
        {enableHighAccuracy:true, timeout:6000}
      );
    });
    lastGPS = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    await fetchWindAt(lastGPS.lat, lastGPS.lng);
  } catch(_) {
    const c = map.getCenter();
    await fetchWindAt(c.lat, c.lng).catch(() => {
      windText.textContent = 'Wind: --';
    });
  }
}

const windRefreshBtn   = document.getElementById('windRefresh');
const coneToggle       = document.getElementById('coneToggle');
const coneWidth        = document.getElementById('coneWidth');
const coneScale        = document.getElementById('coneScale');
const coneAnchorRadios = Array.from(
  document.querySelectorAll('input[name="coneAnchor"]')
);

(function restoreConeSettings(){
  coneToggle.checked = localStorage.getItem('cone_vis') === '1';
  coneWidth.value    = localStorage.getItem('cone_w') || '60';
  coneScale.value    = localStorage.getItem('cone_s') || '1';

  const anch = localStorage.getItem('cone_a') || 'gps';
  const r = coneAnchorRadios.find(x => x.value === anch);
  if (r) r.checked = true;
})();

let scentConeLayer = L.polygon([], {
  color:'#f59e0b',
  weight:2,
  fillColor:'#f59e0b',
  fillOpacity:0.2
});

function toRad(x){ return x * Math.PI / 180; }
function toDeg(x){ return x * 180 / Math.PI; }

function destPoint(lat, lng, bearingDeg, distM){
  const R    = 6378137;
  const br   = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lon1 = toRad(lng);
  const dr   = distM / R;

  const lat2 =
    Math.asin(
      Math.sin(lat1) * Math.cos(dr) +
      Math.cos(lat1) * Math.sin(dr) * Math.cos(br)
    );

  const lon2 =
    lon1 + Math.atan2(
      Math.sin(br) * Math.sin(dr) * Math.cos(lat1),
      Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2)
    );

  return L.latLng(toDeg(lat2), toDeg(lon2));
}

function updateScentCone(){
  if (!coneToggle.checked){
    if (map.hasLayer(scentConeLayer)) map.removeLayer(scentConeLayer);
    return;
  }

  const wind = currentWind;
  if (wind.fromDeg == null) return;

  const toDegWind = (wind.fromDeg + 180) % 360;
  const width     = parseFloat(coneWidth.value);
  const half      = width / 2;
  const scale     = parseFloat(coneScale.value);
  const speed     = Math.max(1, wind.speed || 1);

  const baseLen = 150 + speed * 90;
  const length  = baseLen * scale;

  const anchorMode =
    (coneAnchorRadios.find(r => r.checked)?.value) || 'gps';

  const origin =
    (anchorMode === 'gps' && lastGPS)
      ? lastGPS
      : map.getCenter();

  const pts = [L.latLng(origin.lat, origin.lng)];
  for (let a = -half; a <= half; a += Math.max(5, width / 8)){
    pts.push(
      destPoint(origin.lat, origin.lng, toDegWind + a, length)
    );
  }
  pts.push(L.latLng(origin.lat, origin.lng));

  scentConeLayer.setLatLngs([pts]);
  if (!map.hasLayer(scentConeLayer)) scentConeLayer.addTo(map);
}

function persistCone(){
  localStorage.setItem('cone_vis', coneToggle.checked ? '1' : '0');
  localStorage.setItem('cone_w',   coneWidth.value);
  localStorage.setItem('cone_s',   coneScale.value);

  const anch =
    (coneAnchorRadios.find(r => r.checked) || {}).value || 'gps';
  localStorage.setItem('cone_a', anch);
}

coneToggle.onchange =
  () => { persistCone(); updateScentCone(); };
coneWidth.oninput   =
  () => { persistCone(); updateScentCone(); };
coneScale.oninput   =
  () => { persistCone(); updateScentCone(); };
coneAnchorRadios.forEach(r =>
  r.addEventListener('change', () => {
    persistCone();
    updateScentCone();
  })
);

if (btnWind){
  btnWind.onclick = () => {
    openSheet('wind');
    refreshWind();
  };
}
if (windRefreshBtn){
  windRefreshBtn.onclick = () => refreshWind();
}

map.on('moveend', () => {
  const anch = localStorage.getItem('cone_a') || 'gps';
  if (anch === 'center') updateScentCone();
});

refreshWind();
setInterval(refreshWind, 15 * 60 * 1000);
// [BHH: WIND & SCENT END]


/*******************
 * LIVE GPS DOT + Locate button
 *******************/
// [BHH: GPS START]
let gpsMarker = null;
let gpsCircle = null;
let gpsWatchId = null;

const gpsIcon = L.divIcon({
  className:'',
  html:'<div class="pulse-dot"></div>',
  iconSize:[22,22],
  iconAnchor:[11,11]
});

function updateGPSDot(lat, lng, accuracy){
  const latlng = [lat, lng];

  if (!gpsMarker){
    gpsMarker = L.marker(latlng, {
      icon:gpsIcon,
      interactive:false,
      zIndexOffset:1000
    }).addTo(map);
  } else {
    gpsMarker.setLatLng(latlng);
  }

  const radius = Math.min(accuracy || 50, 200);
  if (!gpsCircle){
    gpsCircle = L.circle(latlng, {
      radius,
      color:'#2563eb',
      weight:2,
      fillColor:'#60a5fa',
      fillOpacity:0.15
    }).addTo(map);
  } else {
    gpsCircle.setLatLng(latlng);
    gpsCircle.setRadius(radius);
  }
}

function ensureGPSWatch(interactive = false){
  if (gpsWatchId || !navigator.geolocation){
    if (!navigator.geolocation && interactive){
      alert('Geolocation not supported');
    }
    return !!gpsWatchId;
  }

  try {
    gpsWatchId = navigator.geolocation.watchPosition(
      pos => {
        const {latitude, longitude, accuracy} = pos.coords;
        lastGPS = {lat:latitude, lng:longitude};
        updateGPSDot(latitude, longitude, accuracy);
      },
      err => {
        if (interactive) alert('Location error: ' + err.message);
      },
      { enableHighAccuracy:true, maximumAge:5000 }
    );
  } catch(e){
    if (interactive) alert('Location error');
  }

  return !!gpsWatchId;
}

setTimeout(() => ensureGPSWatch(false), 800);

const menuLocateBtn = document.getElementById('menuLocate');
if (menuLocateBtn){
  menuLocateBtn.onclick = () => {
    const ok = ensureGPSWatch(true);
    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        pos => {
          const {latitude, longitude, accuracy} = pos.coords;
          lastGPS = {lat:latitude, lng:longitude};
          updateGPSDot(latitude, longitude, accuracy);
          map.setView(
            [latitude, longitude],
            Math.max(map.getZoom(), 15)
          );
        },
        err => alert('Location error: ' + err.message),
        {enableHighAccuracy:true, timeout:8000}
      );
    }
  };
}
// [BHH: GPS END]


/*******************
 * COMPASS + BEARING
 *******************/
// [BHH: COMPASS START]
const compHeadingText   = document.getElementById('compHeadingText');
const compTargetSel     = document.getElementById('compTarget');
const compAnchorRadios  = Array.from(document.querySelectorAll('input[name="compAnchor"]'));
const compDist          = document.getElementById('compDist');
const compBear          = document.getElementById('compBear');
const compEnableBtn     = document.getElementById('compEnable'); // backup button in the sheet

let deviceHeading = null;
let guideTargetId = localStorage.getItem('guide_target') || '';
const guideLine   = L.polyline([], { color:'#fdae6b', weight:3, dashArray:'6,6' }).addTo(map);
let compassStarted = false;

function toRad2(x){ return x * Math.PI / 180; }
function toDeg2(x){ return x * 180 / Math.PI; }

function bearingDeg(a, b){
  const y =
    Math.sin(toRad2(b.lng - a.lng)) *
    Math.cos(toRad2(b.lat));

  const x =
    Math.cos(toRad2(a.lat)) * Math.sin(toRad2(b.lat)) -
    Math.sin(toRad2(a.lat)) * Math.cos(toRad2(b.lat)) *
    Math.cos(toRad2(b.lng - a.lng));

  return (toDeg2(Math.atan2(y, x)) + 360) % 360;
}

// --- Waypoint targets for "Guide" line ---
function rebuildCompassTargets(){
  const wps = [];
  markersLayer.eachLayer(m => {
    const { lat, lng } = m.getLatLng();
    wps.push({
      id:   m.options.id,
      name: m.options.name || 'Unnamed',
      type: m.options.type || 'marker',
      lat,
      lng,
      layer: m
    });
  });

  const opts = ['<option value="">(none)</option>']
    .concat(
      wps.map(w =>
        `<option value="${w.id}">${w.name} — ${w.type}</option>`
      )
    );

  if (compTargetSel){
    compTargetSel.innerHTML = opts.join('');
    if (guideTargetId) compTargetSel.value = guideTargetId;
  }
}

function setGuideTarget(id){
  guideTargetId = id || '';
  localStorage.setItem('guide_target', guideTargetId);
  rebuildCompassTargets();
  updateGuideLine();
}

if (compTargetSel){
  compTargetSel.addEventListener('change', () => {
    setGuideTarget(compTargetSel.value);
  });
}

// --- Guide line origin and drawing ---
function compOrigin(){
  const mode = (compAnchorRadios.find(r => r.checked) || {}).value || 'gps';
  if (mode === 'gps' && lastGPS){
    return L.latLng(lastGPS.lat, lastGPS.lng);
  }
  return map.getCenter();
}

function updateGuideLine(){
  const origin = compOrigin();

  if (!guideTargetId){
    guideLine.setLatLngs([]);
    compDist.textContent = '--';
    compBear.textContent = '--';
    return;
  }

  let targetMarker = null;
  markersLayer.eachLayer(m => {
    if (m.options.id === guideTargetId) targetMarker = m;
  });

  if (!targetMarker){
    guideLine.setLatLngs([]);
    compDist.textContent = '--';
    compBear.textContent = '--';
    return;
  }

  const target = targetMarker.getLatLng();
  guideLine.setLatLngs([origin, target]);

  const d = map.distance(origin, target);
  compDist.textContent =
    d >= 1609.344
      ? (d / 1609.344).toFixed(2) + ' mi'
      : Math.round(d * 3.28084) + ' ft';

  const brg  = bearingDeg(origin, target);
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  const card = dirs[Math.round(brg / 45) % 8];
  compBear.textContent = Math.round(brg) + '° ' + card;
}

// --- Dial / readout ---
function updateCompassDial(){
  const needle = document.getElementById('compassNeedle');
  if (!needle) return;

  const h = deviceHeading;
  const rotation = (h == null ? 0 : h);  // 0° = tip straight up (N)

  // Must match CSS initial transform: translate(-50%, -100%)
  needle.style.transform =
    'translate(-50%, -100%) rotate(' + rotation + 'deg)';
}

function updateCompassReadout(){
  const h = deviceHeading;

  if (h == null){
    compHeadingText.textContent = 'Heading: --';
  } else {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const card = dirs[Math.round(h / 45) % 8];
    compHeadingText.textContent =
      'Heading: ' + Math.round(h) + '° ' + card;
  }

  updateGuideLine();
  updateCompassDial();
}

// --- Device orientation handler ---
function onDeviceOrientation(e){
  let hdg = null;

  // iOS Safari: webkitCompassHeading is already compass-style (0° = N, clockwise)
  if (typeof e.webkitCompassHeading === 'number'){
    hdg = e.webkitCompassHeading;
  } else if (typeof e.alpha === 'number'){
    // Generic: convert alpha (0–360 clockwise) to compass heading:
    // This mapping works consistently on Android Chrome in your tests:
    hdg = (360 - e.alpha) % 360;
  }

  if (hdg == null || isNaN(hdg)) return;

  deviceHeading = hdg;
  updateCompassReadout();
}

// --- Start compass (auto on mobile, hidden on desktop by CSS) ---
async function startCompass(){
  if (compassStarted) return;
  compassStarted = true;

  // iOS permission gate
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'){
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted'){
        compHeadingText.textContent = 'Heading: permission denied';
        return;
      }
    }
  } catch(_){
    // Non-iOS: ignore
  }

  if ('ondeviceorientationabsolute' in window){
    window.addEventListener('deviceorientationabsolute', onDeviceOrientation, true);
  } else if ('ondeviceorientation' in window){
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
  } else {
    compHeadingText.textContent = 'Heading: not supported';
    return;
  }

  // Keep origin updated for guide line
  if (navigator.geolocation && !gpsWatchId){
    ensureGPSWatch(false);
  }
}

// Auto-start on touch / coarse-pointer devices
if (window.matchMedia('(pointer: coarse)').matches){
  startCompass();
}

// Backup: "Enable Compass" button in the sheet
if (compEnableBtn){
  compEnableBtn.addEventListener('click', startCompass);
}

// Keep guide line in sync when anchor changes or map moves
compAnchorRadios.forEach(r =>
  r.addEventListener('change', updateGuideLine)
);

map.on('moveend', () => {
  const mode =
    (compAnchorRadios.find(r => r.checked) || {}).value || 'gps';
  if (mode === 'center') updateGuideLine();
});

// Build initial target list once on load
rebuildCompassTargets();
// [BHH: COMPASS END]


/*******************
 * STATE LOGIC (OH / IN)
 *******************/
// [BHH: STATE – LOGIC START]
const STORAGE_STATE = 'bhh_state_code';

const stateBadgeText   = document.getElementById('stateBadgeText');
const stateSelect      = document.getElementById('stateSelect');
const stateApplyBtn    = document.getElementById('stateApply');
const menuStateBtn     = document.getElementById('menuState');
const stateSheetRadios = Array.from(
  document.querySelectorAll('input[name="bhhState"]')
);

const STATE_CFG = {
  OH: { name:'Ohio',    center:[40.4173, -82.9071], zoom:7 },
  IN: { name:'Indiana', center:[39.905,  -86.2816], zoom:7 }
};

let currentState =
  (localStorage.getItem(STORAGE_STATE) || 'OH').toUpperCase();

function syncStateUI(){
  if (stateBadgeText) stateBadgeText.textContent = currentState;
  if (stateSelect)    stateSelect.value          = currentState;
  stateSheetRadios.forEach(r => {
    r.checked = (r.value.toUpperCase() === currentState);
  });
}

function onStateChanged(){
  const wantedCounties =
    ovlCounties && (
      ovlCounties.checked ||
      map.hasLayer(ohioCounties) ||
      map.hasLayer(indianaCounties)
    );

  const cfg = STATE_CFG[currentState];
  if (cfg) map.setView(cfg.center, cfg.zoom);

  const lblPublic    = document.getElementById('lblPublic');
  const lblCounties  = document.getElementById('lblCounties');
  const lblWaterfowl = document.getElementById('lblWaterfowl');

  if (lblCounties)
    lblCounties.textContent =
      (currentState === 'IN') ? 'Indiana Counties' : 'Ohio Counties';

  if (lblPublic)
    lblPublic.textContent =
      (currentState === 'IN')
        ? 'Indiana Public Hunting (coming soon)'
        : 'Ohio Public Hunting';

  if (lblWaterfowl)
    lblWaterfowl.textContent =
      (currentState === 'IN')
        ? 'Waterfowl Zones (coming soon)'
        : 'Waterfowl Zones';

  const isOH = currentState === 'OH';
  ovlOhio.disabled      = !isOH;
  ovlWaterfowl.disabled = !isOH;
  ovlCounties.disabled  = false;

  if (map.hasLayer(ohioCounties))        map.removeLayer(ohioCounties);
  if (map.hasLayer(countyLabels))        map.removeLayer(countyLabels);
  if (map.hasLayer(indianaCounties))     map.removeLayer(indianaCounties);
  if (map.hasLayer(indianaCountyLabels)) map.removeLayer(indianaCountyLabels);

  if (wantedCounties){
    if (currentState === 'IN'){
      indianaCounties.addTo(map);
      indianaCountyLabels.addTo(map);
      refreshIndianaCountyLabels();
    } else {
      ohioCounties.addTo(map);
      countyLabels.addTo(map);
      refreshCountyLabels();
    }
  }

  syncOverlayChecks();
}

function setState(code, save = true){
  const c = (code || 'OH').toUpperCase();
  currentState = c;
  if (save) localStorage.setItem(STORAGE_STATE, c);
  syncStateUI();
  onStateChanged();
}

syncStateUI();
onStateChanged();

if (menuStateBtn){
  menuStateBtn.onclick = () => openSheet('state');
}

const stateBadge = document.getElementById('stateBadge');
if (stateBadge){
  stateBadge.addEventListener('click', () => openSheet('state'));
}

stateSheetRadios.forEach(r => {
  r.addEventListener('change', () => setState(r.value));
});

if (stateApplyBtn){
  stateApplyBtn.onclick = () => {
    setState(stateSelect.value);
    closeSheets();
  };
}
// [BHH: STATE – LOGIC END]


/*******************
 * SHEETS: open/close + menu wiring
 *******************/
// [BHH: SHEET LOGIC START]
const sheetBg = document.getElementById('sheetBackdrop');
const sheetMap = {
  basemap:  document.getElementById('basemapSheet'),
  tools:    document.getElementById('toolsSheet'),
  waypoints:document.getElementById('waypointsSheet'),
  track:    document.getElementById('trackSheet'),
  wind:     document.getElementById('windSheet'),
  almanac:  document.getElementById('almanacSheet'),
  moon:     document.getElementById('moonSheet'),
  score:    document.getElementById('scoreSheet'),
  compass:  document.getElementById('compassSheet'),
  wpDetail: document.getElementById('wpDetailSheet'),
  state:    document.getElementById('stateSheet')
};

function openSheet(which){
  Object.values(sheetMap).forEach(s => s && s.classList.remove('show'));
  if (!sheetBg || !sheetMap[which]) return;

  sheetBg.classList.add('show');
  sheetMap[which].classList.add('show');

  if (which === 'waypoints') refreshWaypointsUI();

  if (which === 'basemap'){
    syncOverlayChecks();
    syncBaseRadio();
    if (stateSelect) stateSelect.value = currentState;
  }

  if (which === 'moon'){
    renderMoon();
  }

  if (which === 'score'){
    computeHuntScore();
  }

  if (which === 'compass'){
    rebuildCompassTargets();
    updateCompassReadout();
    startCompass();   // ensure compass is running when sheet opens
  }

  if (which === 'almanac'){
    const cb = document.getElementById('almanacFieldInfo');
    if (cb) cb.checked = (localStorage.getItem('ui_info_visible') === '1');
  }
}

function closeSheets(){
  if (!sheetBg) return;
  sheetBg.classList.remove('show');
  Object.values(sheetMap).forEach(s => s && s.classList.remove('show'));
}

if (sheetBg){
  sheetBg.onclick = closeSheets;
}

// Wire the floating “BHH Map Layers” button
(function(){
  const layersBtnHandle = document.getElementById('bhhLayersBtnHandle');
  if (layersBtnHandle){
    layersBtnHandle.onclick = () => openSheet('basemap');
  }
})();

// Inject a top-right × close button into every sheet and wire Esc-to-close
(function installSheetCloseButtons(){
  Object.values(sheetMap).forEach(s => {
    if (!s) return;
    if (!s.querySelector('.close-x')){
      const btn = document.createElement('button');
      btn.type  = 'button';
      btn.className = 'close-x';
      btn.setAttribute('aria-label','Close');
      btn.innerHTML = '&times;';
      btn.addEventListener('click', closeSheets);
      s.appendChild(btn);
    }
  });
})();

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape'){
    closeSheets();
  }
});

// Almanac button + controls
const btnAlmanac   = document.getElementById('menuAlmanac');
const almOpenScore = document.getElementById('almOpenScore');
const almOpenMoon  = document.getElementById('almOpenMoon');
const almFieldInfo = document.getElementById('almanacFieldInfo');
const almClose     = document.getElementById('almanacClose');

// Shop Gear button (bottom menu)
const btnShop = document.getElementById('menuShop');
if (btnShop){
  btnShop.addEventListener('click', () => {
    window.open('https://www.buckeyehunterhub.com/shop', '_blank');
  });
}

if (btnAlmanac){
  btnAlmanac.onclick = () => {
    if (almFieldInfo){
      almFieldInfo.checked =
        (localStorage.getItem('ui_info_visible') === '1');
    }
    openSheet('almanac');
  };
}

if (almOpenScore) almOpenScore.onclick = () => openSheet('score');
if (almOpenMoon)  almOpenMoon.onclick  = () => openSheet('moon');
if (almClose)     almClose.onclick     = () => closeSheets();

if (almFieldInfo){
  almFieldInfo.onchange =
    () => setInfoVisible(almFieldInfo.checked);
}

// Open Tools sheet and sync Delete toggle with current state
const menuToolsBtn = document.getElementById('menuTools');
if (menuToolsBtn){
  menuToolsBtn.onclick = () => {
    const delToggle = document.getElementById('toolDeleteToggle');
    if (delToggle) delToggle.checked = !!deleteMode;
    openSheet('tools');
  };
}

const toolWaypointsBtn = document.getElementById('toolWaypoints');
if (toolWaypointsBtn){
  toolWaypointsBtn.addEventListener('click', () => openSheet('waypoints'));
}

const toolTrackBtn = document.getElementById('toolTrack');
if (toolTrackBtn){
  toolTrackBtn.addEventListener('click', () => openSheet('track'));
}

const toolCompassBtn = document.getElementById('toolCompass');
if (toolCompassBtn){
  toolCompassBtn.addEventListener('click', () => openSheet('compass'));
}

const toolDeleteToggle = document.getElementById('toolDeleteToggle');
if (toolDeleteToggle){
  toolDeleteToggle.onchange = () => {
    deleteMode = toolDeleteToggle.checked;
    const btnDelete = document.getElementById('btnDeleteMode');
    if (btnDelete){
      btnDelete.textContent =
        `Delete: ${deleteMode ? 'On' : 'Off'}`;
    }
  };
}
// [BHH: SHEET LOGIC END]

// Wire overlay toggles that depend on layers defined previously
ovlMarks.onchange =
  () => ovlMarks.checked
    ? markersLayer.addTo(map)
    : map.removeLayer(markersLayer);

ovlTrack.onchange =
  () => ovlTrack.checked
    ? trackLayer.addTo(map)
    : map.removeLayer(trackLayer);


/*******************
 * WAYPOINTS manager UI hooks (fly/edit/guide/delete) + details sheet
 *******************/
// [BHH: WAYPOINTS – UI HOOKS START]
const wpList   = document.getElementById('wpList');
const wpSearch = document.getElementById('wpSearch');
const wpType   = document.getElementById('wpType');
const wpName   = document.getElementById('wpName');

const wpAddCenterBtn = document.getElementById('wpAddCenter');
const wpAddGPSBtn    = document.getElementById('wpAddGPS');

if (wpAddCenterBtn){
  wpAddCenterBtn.onclick = () => {
    const t = wpType.value;
    const n = wpName.value || undefined;
    addMarker(map.getCenter(), t, n);
    refreshWaypointsUI();
    wpName.value = '';
  };
}

if (wpAddGPSBtn){
  wpAddGPSBtn.onclick = () => {
    if (!navigator.geolocation){
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const t = wpType.value;
        const n = wpName.value || undefined;
        addMarker(
          [pos.coords.latitude, pos.coords.longitude],
          t, n
        );
        refreshWaypointsUI();
        wpName.value = '';
      },
      err => alert('Location error: ' + err.message),
      {enableHighAccuracy:true, timeout:8000}
    );
  };
}

function gatherShapes(){
  const arr = [];
  drawnItems.eachLayer(l => {
    const type   = featureTypeFromLayer(l);
    const center =
      l.getBounds
        ? l.getBounds().getCenter()
        : (l.getLatLng ? l.getLatLng() : map.getCenter());
    arr.push({
      kind:'shape',
      type,
      name: l._bhhName || 'Shape',
      layer:l,
      center
    });
  });
  return arr;
}

function getWaypoints(){
  const pts = [];
  markersLayer.eachLayer(m => {
    const {lat, lng} = m.getLatLng();
    pts.push({
      kind:'wp',
      id:m.options.id,
      name:m.options.name,
      type:m.options.type,
      lat,
      lng,
      layer:m
    });
  });
  return pts;
}

function emojiFor(item){
  if (item.kind === 'shape'){
    return ({
      polyline:'📏',
      polygon:'⬠',
      rectangle:'▭',
      circle:'◯'
    })[item.type] || '⬣';
  }
  return ({
    stand:'🎯',
    feeder:'🍽️',
    camera:'📷',
    scrape:'🦌',
    rub:'🪵',
    water:'💧'
  })[item.type] || '📍';
}

function labelFor(item){
  if (item.kind === 'shape'){
    return ({
      polyline:'Line',
      polygon:'Area',
      rectangle:'Plot',
      circle:'Circle'
    })[item.type] || 'Shape';
  }
  return ({
    stand:'Tree Stand',
    feeder:'Feeder',
    camera:'Trail Camera',
    scrape:'Scrape',
    rub:'Rub',
    water:'Water Source'
  })[item.type] || 'Marker';
}

function allItems(){
  return [...getWaypoints(), ...gatherShapes()];
}

function refreshWaypointsUI(){
  if (!wpList) return;

  const q = (wpSearch.value || '').toLowerCase();
  const items = allItems().filter(w =>
    !q ||
    (w.name && w.name.toLowerCase().includes(q)) ||
    (labelFor(w).toLowerCase().includes(q))
  );

  wpList.innerHTML =
    items.length === 0
      ? '<p class="tag" style="margin-top:8px">No items yet.</p>'
      : items.map((w,i) => `
          <div class="item" data-kind="${w.kind}" data-idx="${i}">
            <div class="emoji">${emojiFor(w)}</div>
            <div class="name">
              <input type="text"
                     value="${(w.name || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"/>
            </div>
            <div class="actions"><button class="btn fly">Fly</button></div>
            ${
              w.kind === 'wp'
                ? '<div class="actions"><button class="btn guide">Guide</button></div><div class="actions"><button class="btn edit">Edit</button></div>'
                : '<div></div><div></div>'
            }
            <div class="actions">
              <button class="btn danger del">Delete</button>
            </div>
          </div>`).join('');

  rebuildCompassTargets();
}

if (wpSearch){
  wpSearch.addEventListener('input', refreshWaypointsUI);
}

if (wpList){
  wpList.addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (!item) return;

    const idx   = parseInt(item.dataset.idx, 10);
    const items = allItems();
    const obj   = items[idx];
    if (!obj) return;

    if (e.target.classList.contains('fly')){
      if (obj.kind === 'wp'){
        map.setView([obj.lat, obj.lng], Math.max(map.getZoom(), 16));
        obj.layer.openPopup();
      } else {
        if (obj.layer.getBounds){
          map.fitBounds(obj.layer.getBounds(), { maxZoom:18 });
        } else if (obj.center){
          map.setView(obj.center, 17);
        }
      }
    }

    if (e.target.classList.contains('del')){
      if (obj.kind === 'wp'){
        markersLayer.removeLayer(obj.layer);
        saveMarkers();
      } else {
        drawnItems.removeLayer(obj.layer);
      }
      refreshWaypointsUI();
    }

    if (e.target.classList.contains('edit') && obj.kind === 'wp'){
      openWaypointDetail(obj.layer);
    }

    if (e.target.classList.contains('guide') && obj.kind === 'wp'){
      setGuideTarget(obj.layer.options.id);
      openSheet('compass');
    }
  });

  wpList.addEventListener('input', (e) => {
    const item = e.target.closest('.item');
    if (!item) return;
    const idx   = parseInt(item.dataset.idx, 10);
    const items = allItems();
    const obj   = items[idx];
    if (!obj) return;

    if (e.target.type === 'text'){
      const val = e.target.value;
      if (obj.kind === 'wp'){
        obj.layer.options.name = val;
        obj.layer.bindPopup(markerPopupHTML(obj.layer));
        saveMarkers();
      } else {
        obj.layer._bhhName = val;
      }
    }
  });
}

// Waypoint details (notes + photo)
let editingWP = null;
const wpDetSheet   = document.getElementById('wpDetailSheet');
const wpDetName    = document.getElementById('wpDetName');
const wpDetType    = document.getElementById('wpDetType');
const wpDetNotes   = document.getElementById('wpDetNotes');
const wpPhotoInput = document.getElementById('wpPhotoInput');
const wpPhotoInfo  = document.getElementById('wpPhotoInfo');
const wpPhotoPreview = document.getElementById('wpPhotoPreview');
const wpPickPhotoBtn = document.getElementById('wpPickPhoto');
const wpDetSaveBtn   = document.getElementById('wpDetSave');

if (wpPickPhotoBtn){
  wpPickPhotoBtn.onclick = () => wpPhotoInput.click();
}

function openWaypointDetail(marker){
  editingWP = marker;
  wpDetName.value  = marker.options.name || '';
  wpDetType.value  = marker.options.type || 'stand';
  wpDetNotes.value = marker.options.notes || '';

  if (marker.options.photo){
    wpPhotoInfo.textContent =
      `${Math.round(marker.options.photo.length / 1024)} KB`;
    wpPhotoPreview.innerHTML =
      `<img src="${marker.options.photo}" alt="photo" style="max-width:100%;border-radius:10px;border:1px solid #203325"/>`;
  } else {
    wpPhotoInfo.textContent   = 'No photo';
    wpPhotoPreview.innerHTML  = '';
  }

  openSheet('wpDetail');
}

function readAndCompressImage(file, maxDim = 1280, quality = 0.82){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let {width:w, height:h} = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);

      const c   = document.createElement('canvas');
      c.width   = cw;
      c.height  = ch;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);

      const url = c.toDataURL('image/jpeg', quality);
      if (url.length / 1024 > 1500){
        return reject('Image too large after compression; try a smaller image.');
      }
      resolve(url);
    };
    img.onerror = reject;

    const fr = new FileReader();
    fr.onload  = () => { img.src = fr.result; };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

if (wpPhotoInput){
  wpPhotoInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !editingWP) return;

    try {
      const dataUrl = await readAndCompressImage(file, 1280, 0.82);
      editingWP.options.photo = dataUrl;
      wpPhotoInfo.textContent =
        `${Math.round(dataUrl.length / 1024)} KB`;
      wpPhotoPreview.innerHTML =
        `<img src="${dataUrl}" alt="photo" style="max-width:100%;border-radius:10px;border:1px solid #203325"/>`;
      saveMarkers();
      editingWP.bindPopup(markerPopupHTML(editingWP));
    } catch(err){
      alert('Photo failed: ' + err);
    }

    e.target.value = '';
  });
}

if (wpDetSaveBtn){
  wpDetSaveBtn.onclick = () => {
    if (!editingWP) return;

    editingWP.options.name  = wpDetName.value || editingWP.options.name;
    editingWP.options.type  = wpDetType.value;
    editingWP.options.notes = wpDetNotes.value || '';

    const cfg =
      {
        stand: makeIcon('#2563eb','🎯'),
        feeder:makeIcon('#16a34a','🍽️'),
        camera:makeIcon('#111827','📷'),
        scrape:makeIcon('#6d28d9','🦌'),
        rub:   makeIcon('#b45309','🪵'),
        water: makeIcon('#0891b2','💧')
      }[editingWP.options.type] || makeIcon('#555','📍');

    editingWP.setIcon(cfg);
    editingWP.bindPopup(markerPopupHTML(editingWP));
    saveMarkers();
    refreshWaypointsUI();
    closeSheets();
  };
}

// [BHH: WAYPOINTS – UI HOOKS END]


/*******************
 * STUBS for score/moon/info (safe no-op implementations)
 *******************/
function setInfoVisible(visible){
  // Placeholder: if you had a field info panel, toggle visibility here.
  localStorage.setItem('ui_info_visible', visible ? '1' : '0');
}

function renderMoon(){
  // Placeholder: hook your moon phase rendering here if desired.
}

function computeHuntScore(){
  // Placeholder: hook your hunt score calculation + UI updates here.
       }
