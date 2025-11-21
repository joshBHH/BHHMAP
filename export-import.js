// export-import.js
// Handles:
// - Export (JSON, KML, GPX)
// - Import (JSON/GeoJSON, KML, GPX)
// - Delete Mode toggle button

(() => {
  const btnExport = document.getElementById('btnExport');
  const btnImport = document.getElementById('btnImport');
  const btnDelete = document.getElementById('btnDeleteMode');
  const fileInput = document.getElementById('fileImport');

  /* ---------- helpers: generic ---------- */
  function downloadText(filename, text, mime = 'application/octet-stream') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeXml(s) {
    return String(s || '').replace(/[<>&'"]/g, ch => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    }[ch]));
  }

  /* ---------- EXPORT BUILDERS ---------- */
  /** Collect current state from globals/localStorage */
  function collectAll() {
    const drawings = JSON.parse(
      localStorage.getItem('bhh_drawings_v6') ||
        '{"geojson":{"type":"FeatureCollection","features":[]},"circles":[]}'
    );

    const markers = (() => {
      const out = [];
      if (!window.markersLayer) return out;

      window.markersLayer.eachLayer(m => {
        const { lat, lng } = m.getLatLng();
        out.push({
          id: m.options.id,
          name: m.options.name,
          type: m.options.type,
          lat,
          lng,
          notes: m.options.notes || '',
          photo: m.options.photo || '',
        });
      });
      return out;
    })();

    const track = (() => {
      try {
        return JSON.parse(localStorage.getItem('bhh_track_v1') || '[]');
      } catch {
        return [];
      }
    })();

    return { drawings, markers, track };
  }

  /** Convert a Leaflet circle to a polygon ring (for KML/GPX export) */
  function circleToRing(lat, lng, radiusM, segments = 64) {
    // uses destPoint(lat, lng, bearing, distM) defined globally in main JS
    if (typeof window.destPoint !== 'function') {
      console.warn('[BHH] destPoint missing; circles may not export correctly.');
      return [];
    }

    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const ang = (i / segments) * 360;
      pts.push(window.destPoint(lat, lng, ang, radiusM));
    }
    return pts;
  }

  /** Build KML from current state */
  function buildKML() {
    const { drawings, markers, track } = collectAll();

    let kml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<kml xmlns="http://www.opengis.net/kml/2.2" ` +
      `xmlns:gx="http://www.google.com/kml/ext/2.2">\n` +
      `<Document><name>BuckeyeHunterHub</name>\n`;

    // Markers -> Placemark Points
    kml += `<Folder><name>Markers</name>\n`;
    markers.forEach(m => {
      kml +=
        `<Placemark><name>${escapeXml(m.name)}</name>` +
        (m.notes ? `<description>${escapeXml(m.notes)}</description>` : '') +
        `<Point><coordinates>${m.lng},${m.lat},0</coordinates></Point>` +
        `</Placemark>\n`;
    });
    kml += `</Folder>\n`;

    // Drawings -> polygons/polylines/circles
    kml += `<Folder><name>Drawings</name>\n`;

    // GeoJSON features
    const feats =
      drawings.geojson && drawings.geojson.features
        ? drawings.geojson.features
        : [];

    feats.forEach(f => {
      const props = f.properties || {};
      const nm = props.name || props.shapeType || 'Shape';
      if (!f.geometry) return;

      if (f.geometry.type === 'LineString') {
        const coords = f.geometry.coordinates
          .map(c => `${c[0]},${c[1]},0`)
          .join(' ');
        kml +=
          `<Placemark><name>${escapeXml(nm)}</name>` +
          `<LineString><tessellate>1</tessellate>` +
          `<coordinates>${coords}</coordinates>` +
          `</LineString></Placemark>\n`;
      } else if (f.geometry.type === 'Polygon') {
        const ring = (f.geometry.coordinates && f.geometry.coordinates[0]) || [];
        const coords = ring.map(c => `${c[0]},${c[1]},0`).join(' ');
        kml +=
          `<Placemark><name>${escapeXml(nm)}</name>` +
          `<Polygon><outerBoundaryIs><LinearRing>` +
          `<coordinates>${coords}</coordinates>` +
          `</LinearRing></outerBoundaryIs></Polygon>` +
          `</Placemark>\n`;
      } else if (f.geometry.type === 'MultiPolygon') {
        (f.geometry.coordinates || []).forEach((poly, idx) => {
          const ring = poly[0] || [];
          const coords = ring.map(c => `${c[0]},${c[1]},0`).join(' ');
          kml +=
            `<Placemark><name>${escapeXml(nm)} (${idx + 1})</name>` +
            `<Polygon><outerBoundaryIs><LinearRing>` +
            `<coordinates>${coords}</coordinates>` +
            `</LinearRing></outerBoundaryIs></Polygon>` +
            `</Placemark>\n`;
        });
      }
    });

    // Circles
    (drawings.circles || []).forEach(c => {
      const name = (c.properties && c.properties.name) || 'Circle';
      const ringPts = circleToRing(c.lat, c.lng, c.radius);
      const coords = ringPts.map(p => `${p.lng},${p.lat},0`).join(' ');
      kml +=
        `<Placemark><name>${escapeXml(name)}</name>` +
        `<Polygon><outerBoundaryIs><LinearRing>` +
        `<coordinates>${coords}</coordinates>` +
        `</LinearRing></outerBoundaryIs></Polygon>` +
        `</Placemark>\n`;
    });

    // Track -> gx:Track or LineString
    if (track && track.length) {
      const hasTime = track.every(p => typeof p.t === 'number');

      if (hasTime) {
        kml += `<Placemark><name>Track</name><gx:Track>\n`;
        track.forEach(p => {
          kml += `<when>${new Date(p.t).toISOString()}</when>\n`;
        });
        track.forEach(p => {
          kml += `<gx:coord>${p.lng} ${p.lat} 0</gx:coord>\n`;
        });
        kml += `</gx:Track></Placemark>\n`;
      } else {
        const coords = track.map(p => `${p.lng},${p.lat},0`).join(' ');
        kml +=
          `<Placemark><name>Track</name>` +
          `<LineString><tessellate>1</tessellate>` +
          `<coordinates>${coords}</coordinates></LineString>` +
          `</Placemark>\n`;
      }
    }

    kml += `</Document></kml>`;
    return kml;
  }

  /** Build GPX (markers->wpt, shapes->rte, track->trk) */
  function buildGPX() {
    const { drawings, markers, track } = collectAll();

    let gpx =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<gpx version="1.1" creator="BuckeyeHunterHub" ` +
      `xmlns="http://www.topografix.com/GPX/1/1">\n`;

    // Waypoints
    markers.forEach(m => {
      gpx +=
        `<wpt lat="${m.lat}" lon="${m.lng}">` +
        `<name>${escapeXml(m.name)}</name>` +
        (m.notes ? `<desc>${escapeXml(m.notes)}</desc>` : '') +
        `</wpt>\n`;
    });

    // Routes from drawings
    const feats =
      drawings.geojson && drawings.geojson.features
        ? drawings.geojson.features
        : [];
    let rteIdx = 1;

    feats.forEach(f => {
      const props = f.properties || {};
      const nm = props.name || props.shapeType || `Route ${rteIdx}`;
      if (!f.geometry) return;

      if (f.geometry.type === 'LineString') {
        const line = f.geometry.coordinates;
        gpx += `<rte><name>${escapeXml(nm)}</name>\n`;
        line.forEach(c => {
          gpx += `<rtept lat="${c[1]}" lon="${c[0]}"></rtept>\n`;
        });
        gpx += `</rte>\n`;
        rteIdx++;
      } else if (f.geometry.type === 'Polygon') {
        const ring =
          (f.geometry.coordinates && f.geometry.coordinates[0]) || [];
        if (ring.length) {
          gpx += `<rte><name>${escapeXml(nm)} (polygon)</name>\n`;
          ring.forEach(c => {
            gpx += `<rtept lat="${c[1]}" lon="${c[0]}"></rtept>\n`;
          });
          gpx += `</rte>\n`;
          rteIdx++;
        }
      } else if (f.geometry.type === 'MultiPolygon') {
        (f.geometry.coordinates || []).forEach((poly, idx) => {
          const ring = poly[0] || [];
          if (ring.length) {
            gpx +=
              `<rte><name>${escapeXml(nm)} (part ${idx + 1})</name>\n`;
            ring.forEach(c => {
              gpx += `<rtept lat="${c[1]}" lon="${c[0]}"></rtept>\n`;
            });
            gpx += `</rte>\n`;
            rteIdx++;
          }
        });
      }
    });

    // Circles as closed route
    (drawings.circles || []).forEach(c => {
      const name = (c.properties && c.properties.name) || 'Circle';
      const ringPts = circleToRing(c.lat, c.lng, c.radius);
      gpx += `<rte><name>${escapeXml(name)}</name>\n`;
      ringPts.forEach(p => {
        gpx += `<rtept lat="${p.lat}" lon="${p.lng}"></rtept>\n`;
      });
      gpx += `</rte>\n`;
    });

    // Track
    if (track && track.length) {
      const name =
        'BHH Track ' +
        new Date(track[0].t || Date.now()).toISOString().slice(0, 10);
      gpx += `<trk><name>${escapeXml(name)}</name><trkseg>\n`;
      track.forEach(p => {
        gpx +=
          `<trkpt lat="${p.lat}" lon="${p.lng}">` +
          (p.t ? `<time>${new Date(p.t).toISOString()}</time>` : '') +
          `</trkpt>\n`;
      });
      gpx += `</trkseg></trk>\n`;
    }

    gpx += `</gpx>`;
    return gpx;
  }

  /* ---------- IMPORTERS ---------- */
  function parseKML(text) {
    const dom = new DOMParser().parseFromString(text, 'application/xml');
    const $ = (sel, root = dom) =>
      Array.from(root.getElementsByTagName(sel));
    const gx = (sel, root = dom) =>
      Array.from(
        root.getElementsByTagNameNS(
          'http://www.google.com/kml/ext/2.2',
          sel
        )
      );

    // Points -> markers
    $('Placemark').forEach(pm => {
      const name =
        pm.getElementsByTagName('name')[0]?.textContent || 'Marker';
      const desc =
        pm.getElementsByTagName('description')[0]?.textContent || '';

      const pt = pm.getElementsByTagName('Point')[0];
      if (pt) {
        const coordTxt =
          pt.getElementsByTagName('coordinates')[0]?.textContent?.trim() ||
          '';
        const [lng, lat] = coordTxt.split(/[\s,]+/).map(Number);
        if (isFinite(lat) && isFinite(lng) && typeof window.addMarker === 'function') {
          window.addMarker([lat, lng], 'stand', name, undefined, desc);
        }
        return;
      }

      // LineString -> polyline
      const ls = pm.getElementsByTagName('LineString')[0];
      if (ls && window.L && window.drawnItems) {
        const coordTxt =
          ls.getElementsByTagName('coordinates')[0]?.textContent || '';
        const pairs = coordTxt
          .trim()
          .split(/\s+/)
          .map(s => s.split(',').map(Number));
        const latlngs = pairs.map(p => window.L.latLng(p[1], p[0]));
        const layer = window.L.polyline(latlngs, { color: '#6dbc5d' });
        layer._bhhName = name;
        window.drawnItems.addLayer(layer);
        return;
      }

      // Polygon -> polygon
      const poly = pm.getElementsByTagName('Polygon')[0];
      if (poly && window.L && window.drawnItems) {
        const ringTxt =
          poly.getElementsByTagName('coordinates')[0]?.textContent || '';
        const pairs = ringTxt
          .trim()
          .split(/\s+/)
          .map(s => s.split(',').map(Number));
        const latlngs = pairs.map(p => window.L.latLng(p[1], p[0]));
        const layer = window.L.polygon(latlngs, {
          color: '#6dbc5d',
          fillOpacity: 0.15,
        });
        layer._bhhName = name;
        window.drawnItems.addLayer(layer);
        return;
      }

      // gx:Track -> trackPoints
      const trackNode = gx('Track', pm)[0];
      if (trackNode && window.L && window.trackLayer) {
        const whens = Array.from(
          trackNode.getElementsByTagName('when')
        ).map(n => new Date(n.textContent).getTime());
        const coords = gx('coord', trackNode).map(n =>
          n.textContent
            .trim()
            .split(/\s+/)
            .map(Number)
        ); // lng lat alt

        const pts = [];
        for (let i = 0; i < coords.length; i++) {
          const [lng, lat] = coords[i];
          const t = whens[i] || Date.now();
          if (isFinite(lat) && isFinite(lng)) pts.push({ lat, lng, t });
        }

        if (pts.length) {
          window.trackPoints = pts;
          window.trackLayer.setLatLngs(pts.map(p => [p.lat, p.lng]));
          if (typeof window.saveTrack === 'function') {
            window.saveTrack();
          }
        }
      }
    });

    if (typeof window.saveDraw === 'function') window.saveDraw();
    if (typeof window.saveMarkers === 'function') window.saveMarkers();
  }

  function parseGPX(text) {
    const dom = new DOMParser().parseFromString(text, 'application/xml');
    const $ = (sel, root = dom) =>
      Array.from(root.getElementsByTagName(sel));

    // wpt -> markers
    $('wpt').forEach(n => {
      const lat = parseFloat(n.getAttribute('lat'));
      const lon = parseFloat(n.getAttribute('lon'));
      if (!isFinite(lat) || !isFinite(lon)) return;

      const name =
        n.getElementsByTagName('name')[0]?.textContent || 'Marker';
      const desc =
        n.getElementsByTagName('desc')[0]?.textContent || '';

      if (typeof window.addMarker === 'function') {
        window.addMarker([lat, lon], 'stand', name, undefined, desc);
      }
    });

    // rte -> polyline or polygon
    $('rte').forEach(r => {
      const pts = Array.from(r.getElementsByTagName('rtept'))
        .map(p => [
          parseFloat(p.getAttribute('lat')),
          parseFloat(p.getAttribute('lon')),
        ])
        .filter(p => isFinite(p[0]) && isFinite(p[1]));
      const name =
        r.getElementsByTagName('name')[0]?.textContent || 'Route';

      if (!pts.length || !window.L || !window.drawnItems) return;

      const isClosed =
        pts.length > 2 &&
        Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-6 &&
        Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-6;

      const layer = isClosed
        ? window.L.polygon(pts, {
            color: '#6dbc5d',
            fillOpacity: 0.15,
          })
        : window.L.polyline(pts, { color: '#6dbc5d' });

      layer._bhhName = name;
      window.drawnItems.addLayer(layer);
    });

    // trk -> main track
    const trk = $('trk')[0];
    if (trk && window.trackLayer) {
      const pts = Array.from(trk.getElementsByTagName('trkpt'))
        .map(p => {
          const lat = parseFloat(p.getAttribute('lat'));
          const lon = parseFloat(p.getAttribute('lon'));
          const time =
            p.getElementsByTagName('time')[0]?.textContent;
          const t = time ? new Date(time).getTime() : Date.now();
          return { lat, lng: lon, t };
        })
        .filter(p => isFinite(p.lat) && isFinite(p.lng));

      if (pts.length) {
        window.trackPoints = pts;
        window.trackLayer.setLatLngs(pts.map(p => [p.lat, p.lng]));
        if (typeof window.saveTrack === 'function') {
          window.saveTrack();
        }
      }
    }

    if (typeof window.saveDraw === 'function') window.saveDraw();
    if (typeof window.saveMarkers === 'function') window.saveMarkers();
  }

  /* ---------- EXPORT ACTION ---------- */
  if (btnExport) {
    btnExport.onclick = () => {
      const choice = (
        prompt('Export format: json | kml | gpx', 'json') || 'json'
      )
        .trim()
        .toLowerCase();

      try {
        if (choice === 'kml') {
          const kml = buildKML();
          downloadText(
            'buckeyehunterhub.kml',
            kml,
            'application/vnd.google-earth.kml+xml'
          );
        } else if (choice === 'gpx') {
          const gpx = buildGPX();
          downloadText('buckeyehunterhub.gpx', gpx, 'application/gpx+xml');
        } else {
          const all = collectAll();
          downloadText(
            'buckeyehunterhub-export.json',
            JSON.stringify(all, null, 2),
            'application/json'
          );
        }
      } catch (e) {
        alert('Export failed: ' + e.message);
      }
    };
  }

  /* ---------- IMPORT ACTION ---------- */
  if (btnImport && fileInput) {
    btnImport.onclick = () => fileInput.click();

    fileInput.onchange = ev => {
      const f = ev.target.files[0];
      if (!f) return;

      const name = f.name.toLowerCase();
      const ext = name.endsWith('.kml')
        ? 'kml'
        : name.endsWith('.gpx')
        ? 'gpx'
        : name.endsWith('.geojson')
        ? 'geojson'
        : name.endsWith('.json')
        ? 'json'
        : 'auto';

      const r = new FileReader();
      r.onload = () => {
        try {
          const text = r.result;

          if (ext === 'kml') {
            parseKML(text);
          } else if (ext === 'gpx') {
            parseGPX(text);
          } else {
            // JSON / GeoJSON fallback (legacy)
            const obj = JSON.parse(text);

            if (
              obj.drawings &&
              (obj.drawings.geojson || obj.drawings.circles)
            ) {
              localStorage.setItem(
                'bhh_drawings_v6',
                JSON.stringify(obj.drawings)
              );

              if (window.drawnItems && window.segmentLabelsGroup) {
                window.drawnItems.clearLayers();
                window.segmentLabelsGroup.clearLayers();
              }

              if (typeof window.restoreDraw === 'function') {
                window.restoreDraw();
              }
            } else if (
              obj.type === 'FeatureCollection' ||
              obj.type === 'Feature'
            ) {
              // plain GeoJSON into drawings
              if (window.L && window.drawnItems) {
                window.L.geoJSON(obj, {
                  onEachFeature: (_, l) => window.drawnItems.addLayer(l),
                });
              }
              localStorage.setItem(
                'bhh_drawings_v6',
                JSON.stringify({ geojson: obj, circles: [] })
              );
            }

            if (obj.markers && typeof window.deserializeMarkers === 'function') {
              window.deserializeMarkers(obj.markers);
            }

            if (obj.track) {
              localStorage.setItem('bhh_track_v1', JSON.stringify(obj.track));
              try {
                const raw = localStorage.getItem('bhh_track_v1');
                if (raw && window.trackLayer) {
                  window.trackPoints = JSON.parse(raw) || [];
                  window.trackLayer.setLatLngs(
                    window.trackPoints.map(p => [p.lat, p.lng])
                  );
                }
              } catch {}
            }
          }

          if (typeof window.refreshWaypointsUI === 'function') {
            window.refreshWaypointsUI();
          }
          if (typeof window.updateTrackStats === 'function') {
            window.updateTrackStats();
          }
        } catch (e) {
          alert('Import failed: ' + e.message);
        } finally {
          ev.target.value = '';
        }
      };

      r.readAsText(f);
    };
  }

  /* ---------- DELETE MODE BUTTON ---------- */
  if (btnDelete) {
    btnDelete.onclick = () => {
      // deleteMode is the shared global flag used by markers/waypoints
      if (typeof window.deleteMode === 'undefined') {
        window.deleteMode = false;
      }
      window.deleteMode = !window.deleteMode;
      btnDelete.textContent = `Delete: ${window.deleteMode ? 'On' : 'Off'}`;
    };
  }
})();
