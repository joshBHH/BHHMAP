// Your map init code extracted – almost identical
const map = L.map('map').setView([40.4173, -82.9071], 7);

// Basemaps (unchanged)
const basic = L.tileLayer('https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler & OpenStreetMap contributors' });
const satellite = L.tileLayer('https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler' });
const topo = L.tileLayer('https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler & OpenStreetMap contributors' });
const hybrid = L.tileLayer('https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=VLOZCnjQYBtgpZ3BXBK3', { attribution: '&copy; MapTiler' });

hybrid.addTo(map);
const baseByKey = { basic, satellite, topo, hybrid };
const STORAGE_BASE = 'ui_basemap_key';
function setBasemap(key){
  Object.values(baseByKey).forEach(l=> map.removeLayer(l));
  (baseByKey[key] || hybrid).addTo(map);
  localStorage.setItem(STORAGE_BASE, key);
}
(function restoreBasemap(){
  const k = localStorage.getItem(STORAGE_BASE);
  if(k && baseByKey[k]) setBasemap(k);
})();

// Drawn items (your code unchanged)
const drawnItems = new L.FeatureGroup().addTo(map);
// [BHH: DRAW – STORAGE START]
    const drawnItems = new L.FeatureGroup().addTo(map);
    const segmentLabelsGroup = L.layerGroup().addTo(map); // used by distance labels
    const STORAGE_DRAW = 'bhh_drawings_v6';

    // helper: detect shape type
    function featureTypeFromLayer(l){
      if(l instanceof L.Circle) return 'circle';
      if(l instanceof L.Rectangle) return 'rectangle';
      if(l instanceof L.Polygon && !(l instanceof L.Rectangle)) return 'polygon';
      if(l instanceof L.Polyline && !(l instanceof L.Polygon)) return 'polyline';
      return 'shape';
    }
    function defaultShapeName(type){
      const base = {polyline:'Line', polygon:'Area', rectangle:'Plot', circle:'Circle', shape:'Shape'}[type] || 'Shape';
      let n=1; drawnItems.eachLayer(l=>{ if(featureTypeFromLayer(l)===type) n++; });
      return `${base} ${n}`;
    }

    // save/restore drawings (circles handled separately)
    function saveDraw(){
      const geojson = { type:'FeatureCollection', features:[] };
      const circles = [];
      drawnItems.eachLayer(l=>{
        const type = featureTypeFromLayer(l);
        if(type==='circle'){
          const c = l.getLatLng();
          circles.push({ lat:c.lat, lng:c.lng, radius:l.getRadius(), properties:{ name:l._bhhName || defaultShapeName('circle'), shapeType:'circle' } });
        } else {
          const f = l.toGeoJSON();
          f.properties = Object.assign({}, f.properties||{}, { name: l._bhhName || defaultShapeName(type), shapeType:type });
          geojson.features.push(f);
        }
      });
      const bundle = { geojson, circles };
      localStorage.setItem(STORAGE_DRAW, JSON.stringify(bundle));
    }
    function restoreDraw(){
      const raw = localStorage.getItem(STORAGE_DRAW);
      if(!raw) return;
      try{
        const data = JSON.parse(raw);
        if(data && data.geojson){
          L.geoJSON(data.geojson, { onEachFeature:(feat,layer)=>{
            layer._bhhName = (feat.properties && feat.properties.name) || defaultShapeName(featureTypeFromLayer(layer));
            drawnItems.addLayer(layer);
            if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) { labelPolylineSegments(layer); updatePolylineTotalLabel(layer); }
          }});
          (data.circles||[]).forEach(c=>{
            const layer = L.circle([c.lat,c.lng], { radius:c.radius });
            layer._bhhName = (c.properties && c.properties.name) || defaultShapeName('circle');
            drawnItems.addLayer(layer);
          });
        } else if(data.type==='FeatureCollection'){ // legacy
          L.geoJSON(data, { onEachFeature:(_,layer)=>{ layer._bhhName = defaultShapeName(featureTypeFromLayer(layer)); drawnItems.addLayer(layer); if(layer instanceof L.Polyline && !(layer instanceof L.Polygon)) { labelPolylineSegments(layer); updatePolylineTotalLabel(layer); } } });
        }
      }catch(e){ console.warn('restore drawings failed', e); }
    }
    restoreDraw();

    // distance labels for polylines
    function fmtFeetMiles(m){
      const ft = m * 3.28084;
      if(m >= 1609.344) return (m/1609.344).toFixed(2) + ' mi';
      return Math.round(ft) + ' ft';
    }
    function removeSegLabels(layer){
      if(layer._segLabels){ layer._segLabels.forEach(lbl=> segmentLabelsGroup.removeLayer(lbl)); layer._segLabels = null; }
    }
    function removeTotalLabel(layer){ if(layer._totalLabel){ segmentLabelsGroup.removeLayer(layer._totalLabel); layer._totalLabel=null; } }
    function labelPolylineSegments(layer){
      removeSegLabels(layer);
      const latlngs = layer.getLatLngs();
      const pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      const labels=[];
      for(let i=1;i<pts.length;i++){
        const a = pts[i-1], b = pts[i];
        const d = map.distance(a, b);
        const mid = L.latLng((a.lat+b.lat)/2, (a.lng+b.lng)/2);
        const marker = L.marker(mid, { interactive:false, icon: L.divIcon({ className:'', html:`<div class="seglabel">${fmtFeetMiles(d)}</div>` }) });
        marker.addTo(segmentLabelsGroup);
        labels.push(marker);
      }
      layer._segLabels = labels;
    }
    function polylineTotalDistance(layer){
      const latlngs = layer.getLatLngs();
      const pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      let d=0; for(let i=1;i<pts.length;i++){ d += map.distance(pts[i-1], pts[i]); } return d;
    }
    function updatePolylineTotalLabel(layer){
      removeTotalLabel(layer);
      const latlngs = layer.getLatLngs();
      const pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      if(pts.length<2) return;
      const a = pts[pts.length-2], b = pts[pts.length-1];
      const anchor = L.latLng((a.lat*0.3 + b.lat*0.7), (a.lng*0.3 + b.lng*0.7));
      const total = fmtFeetMiles(polylineTotalDistance(layer));
      const marker = L.marker(anchor, { interactive:false, icon: L.divIcon({ className:'', html:`<div class="seglabel"><b>Total:</b> ${total}</div>` }) });
      marker.addTo(segmentLabelsGroup);
      layer._totalLabel = marker;
    }
    function relabelPolyline(layer){ labelPolylineSegments(layer); }
    // [BHH: DRAW – STORAGE END]

// Global exports for other modules
window.BHH = { map, drawnItems /* add more as needed */ };

function initApp() {
  // Call init from other modules
  initStateManager(); // From state-manager.js
  initUI(); // From ui.js
  // etc.
}

export { map, initApp };
