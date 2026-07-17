import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import config from '../config';
import { useT, typeLabel } from '../i18n';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

if (!process.env.REACT_APP_MAPBOX_TOKEN) {
  console.error('Mapbox token not found! Set REACT_APP_MAPBOX_TOKEN in your .env.');
}

// ['match', ['get','need'], need, color, …, fallback]
function buildColorExpr() {
  const entries = Object.entries(config.needs).flatMap(([need, { color }]) => [
    need,
    color,
  ]);
  return ['match', ['get', 'need'], ...entries, config.fallbackColor];
}

const EMPTY = { type: 'FeatureCollection', features: [] };
const STATUS_KEYS = {
  open: 'statusOpen',
  closed: 'statusClosed',
  unknown: 'statusUnknown',
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

// A pill-style open/closed badge for the hover tooltip, matching the list
// cards (colors come from config so the two stay in sync).
function statusBadgeHtml(status, label) {
  const c = config.statusColors[status] || config.statusColors.unknown;
  return (
    `<span style="display:inline-block;margin-top:4px;padding:1px 8px;` +
    `border-radius:9999px;font-size:11px;font-weight:600;` +
    `background:${c.bg};color:${c.fg}">${escapeHtml(label)}</span>`
  );
}

// [ [w,s], [e,n] ] over every coordinate of a Polygon/MultiPolygon feature.
function featureBounds(feature) {
  const b = [[Infinity, Infinity], [-Infinity, -Infinity]];
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      b[0][0] = Math.min(b[0][0], coords[0]);
      b[0][1] = Math.min(b[0][1], coords[1]);
      b[1][0] = Math.max(b[1][0], coords[0]);
      b[1][1] = Math.max(b[1][1], coords[1]);
    } else coords.forEach(walk);
  };
  walk(feature.geometry.coordinates);
  return b;
}

export default function ResourceMap({
  resources,
  center,
  area, // GeoJSON polygon of the reachable / drawn area (or null)
  drawing, // true while the user is sketching an area
  onDrawComplete, // (ring: [lng,lat][]) => void
  selectedId,
  hoveredId,
  onSelect,
  onBoundsChange,
  resetToken, // bump this to fly the map back to its default statewide view
}) {
  const t = useT();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Latest callbacks, readable from handlers bound once at map load.
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onSelectRef = useRef(onSelect);
  const onDrawCompleteRef = useRef(onDrawComplete);
  onBoundsChangeRef.current = onBoundsChange;
  onSelectRef.current = onSelect;
  onDrawCompleteRef.current = onDrawComplete;

  // Initialize the map once.
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: config.map.style,
      center: config.map.center,
      zoom: config.map.zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');
    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'mapbox-popup-hover',
    });

    map.current.on('load', () => {
      const m = map.current;

      // Reachable-area polygon (below points).
      m.addSource('area', { type: 'geojson', data: EMPTY });
      m.addLayer({
        id: 'area-fill',
        type: 'fill',
        source: 'area',
        paint: { 'fill-color': config.brand.primary, 'fill-opacity': 0.08 },
      });
      m.addLayer({
        id: 'area-line',
        type: 'line',
        source: 'area',
        paint: {
          'line-color': config.brand.primary,
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });

      // Live trace shown while the user is drawing.
      m.addSource('draw-trace', { type: 'geojson', data: EMPTY });
      m.addLayer({
        id: 'draw-trace-line',
        type: 'line',
        source: 'draw-trace',
        paint: {
          'line-color': config.brand.primary,
          'line-width': 2.5,
          'line-dasharray': [1.5, 1.5],
        },
      });

      // Resource points.
      m.addSource('resources', { type: 'geojson', data: EMPTY });
      m.addLayer({
        id: 'resource-points',
        type: 'circle',
        source: 'resources',
        paint: {
          // Selected point flips to the off-palette highlight color; the rest
          // keep their per-need color.
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            config.selectedColor,
            buildColorExpr(),
          ],
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            9,
            ['boolean', ['feature-state', 'hover'], false],
            8,
            6,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            1.5,
          ],
          'circle-opacity': 0.9,
        },
      });

      // Hover: enlarge the dot + show a tooltip with name / type / status.
      let hoveredFeatureId = null;
      m.on('mousemove', 'resource-points', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        m.getCanvas().style.cursor = 'pointer';
        if (hoveredFeatureId !== null && hoveredFeatureId !== f.id) {
          m.setFeatureState({ source: 'resources', id: hoveredFeatureId }, { hover: false });
        }
        hoveredFeatureId = f.id;
        m.setFeatureState({ source: 'resources', id: f.id }, { hover: true });

        const p = f.properties;
        popup.current
          .setLngLat(f.geometry.coordinates)
          .setHTML(
            `<strong>${escapeHtml(p.name)}</strong>` +
              `<div style="margin-top:2px;color:#4b5563">${escapeHtml(p.typeLabel)}</div>` +
              statusBadgeHtml(p.status, p.statusLabel)
          )
          .addTo(m);
      });
      m.on('mouseleave', 'resource-points', () => {
        m.getCanvas().style.cursor = '';
        if (hoveredFeatureId !== null) {
          m.setFeatureState({ source: 'resources', id: hoveredFeatureId }, { hover: false });
        }
        hoveredFeatureId = null;
        popup.current.remove();
      });
      m.on('click', 'resource-points', (e) => {
        const f = e.features?.[0];
        if (f) onSelectRef.current?.(f.id);
      });

      const emitBounds = () => onBoundsChangeRef.current?.(m.getBounds());
      m.on('moveend', emitBounds);

      setIsReady(true);
      emitBounds();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Push resource data into the map. Tooltip text is baked into feature
  // properties, so this re-runs when the language changes too.
  useEffect(() => {
    if (!isReady) return;
    map.current.getSource('resources').setData({
      type: 'FeatureCollection',
      features: resources.map((r) => ({
        type: 'Feature',
        id: r.id,
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          name: r.name,
          need: r.need,
          typeLabel: typeLabel(t, r.resourceType),
          status: r.status,
          statusLabel: t(STATUS_KEYS[r.status]),
        },
      })),
    });
  }, [resources, isReady, t]);

  // Show the reachable/drawn area and frame the view around it.
  useEffect(() => {
    if (!isReady) return;
    const m = map.current;
    m.getSource('area').setData(area ?? EMPTY);
    if (area) {
      m.fitBounds(featureBounds(area), { padding: 40, duration: 1000 });
    } else if (center) {
      m.flyTo({ center: [center.lng, center.lat], zoom: 11, duration: 1000 });
    }
  }, [area, center, isReady]);

  // Return to the default statewide view when the reset token changes
  // (e.g. after "Clear drawn area"). Skips the initial 0 so it doesn't fire
  // on first load, where the map already opens at the default view.
  useEffect(() => {
    if (!isReady || !resetToken) return;
    map.current.flyTo({
      center: config.map.center,
      zoom: config.map.zoom,
      duration: 1000,
    });
  }, [resetToken, isReady]);

  // Freehand draw mode: press, drag a shape, release to finish.
  useEffect(() => {
    if (!isReady || !drawing) return;
    const m = map.current;
    m.dragPan.disable();
    m.getCanvas().style.cursor = 'crosshair';

    let ring = [];
    let active = false;

    const onDown = (e) => {
      e.preventDefault?.();
      active = true;
      ring = [e.lngLat.toArray()];
    };
    const onMove = (e) => {
      if (!active) return;
      e.preventDefault?.();
      ring.push(e.lngLat.toArray());
      m.getSource('draw-trace').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: ring },
        properties: {},
      });
    };
    const onUp = () => {
      if (!active) return;
      active = false;
      onDrawCompleteRef.current?.(ring);
    };

    m.on('mousedown', onDown);
    m.on('mousemove', onMove);
    m.on('mouseup', onUp);
    m.on('touchstart', onDown);
    m.on('touchmove', onMove);
    m.on('touchend', onUp);

    return () => {
      m.off('mousedown', onDown);
      m.off('mousemove', onMove);
      m.off('mouseup', onUp);
      m.off('touchstart', onDown);
      m.off('touchmove', onMove);
      m.off('touchend', onUp);
      m.getSource('draw-trace')?.setData(EMPTY);
      m.getCanvas().style.cursor = '';
      m.dragPan.enable();
    };
  }, [drawing, isReady]);

  // Reflect selection into feature-state + fly to the selected resource.
  const prevSelected = useRef(null);
  useEffect(() => {
    if (!isReady) return;
    const m = map.current;
    if (prevSelected.current != null) {
      m.setFeatureState({ source: 'resources', id: prevSelected.current }, { selected: false });
    }
    if (selectedId != null) {
      m.setFeatureState({ source: 'resources', id: selectedId }, { selected: true });
      const r = resources.find((x) => x.id === selectedId);
      if (r) m.flyTo({ center: [r.lng, r.lat], zoom: Math.max(m.getZoom(), 11), duration: 900 });
    }
    prevSelected.current = selectedId;
  }, [selectedId, isReady, resources]);

  // Reflect hover-from-list into feature-state.
  const prevHovered = useRef(null);
  useEffect(() => {
    if (!isReady) return;
    const m = map.current;
    if (prevHovered.current != null && prevHovered.current !== selectedId) {
      m.setFeatureState({ source: 'resources', id: prevHovered.current }, { hover: false });
    }
    if (hoveredId != null) {
      m.setFeatureState({ source: 'resources', id: hoveredId }, { hover: true });
    }
    prevHovered.current = hoveredId;
  }, [hoveredId, isReady, selectedId]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
