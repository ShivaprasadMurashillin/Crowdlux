import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';

const DEFAULT_CENTER = { lat: 28.5665, lng: 77.2433 };

const inferAnchor = (zone) => {
  const text = `${zone?.id || ''} ${zone?.name || ''}`.toLowerCase();
  if (text.includes('north')) return { lat: 0.00055, lng: 0 };
  if (text.includes('south')) return { lat: -0.00055, lng: 0 };
  if (text.includes('east')) return { lat: 0, lng: 0.00055 };
  if (text.includes('west')) return { lat: 0, lng: -0.00055 };
  if (text.includes('vip')) return { lat: 0.00045, lng: -0.00038 };
  if (text.includes('media') || text.includes('press')) return { lat: -0.00045, lng: 0.00038 };
  return null;
};

const generateZonePosition = (zone, center, categoryCount) => {
  if (typeof zone?.lat === 'number' && typeof zone?.lng === 'number') {
    return {
      position: { lat: zone.lat, lng: zone.lng },
      inferred: false,
    };
  }

  const anchored = inferAnchor(zone);
  if (anchored) {
    return {
      position: { lat: center.lat + anchored.lat, lng: center.lng + anchored.lng },
      inferred: true,
    };
  }

  const category = zone?.category || 'misc';
  const index = categoryCount[category] || 0;
  categoryCount[category] = index + 1;

  const angle = (index * 55 + category.length * 23) * (Math.PI / 180);
  const radius = 0.00022 + (index % 3) * 0.0001;
  return {
    position: {
      lat: center.lat + Math.sin(angle) * radius,
      lng: center.lng + Math.cos(angle) * radius,
    },
    inferred: true,
  };
};

const percentFull = (zone) => {
  if (!zone?.capacity) return 0;
  return Math.round((zone.current_count / zone.capacity) * 100);
};

const MapCanvas = ({ stadium, zoneList, originZoneId, destinationZoneId, onRouteInfo }) => {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const fallbackRouteRef = useRef(null);
  const routeAnimationTimerRef = useRef(null);

  useEffect(() => {
    if (!window.google || !mapElementRef.current) return;

    const center = {
      lat: Number(stadium?.lat) || DEFAULT_CENTER.lat,
      lng: Number(stadium?.lng) || DEFAULT_CENTER.lng,
    };

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapElementRef.current, {
        center,
        zoom: 18,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapRef.current,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: '#1A73E8',
          strokeWeight: 6,
          strokeOpacity: 0.85,
        },
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    mapRef.current.setCenter(center);

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (fallbackRouteRef.current) {
      fallbackRouteRef.current.setMap(null);
      fallbackRouteRef.current = null;
    }
    if (routeAnimationTimerRef.current) {
      window.clearInterval(routeAnimationTimerRef.current);
      routeAnimationTimerRef.current = null;
    }
    directionsRendererRef.current?.setDirections({ routes: [] });

    const categoryCount = {};
    const positionsByZoneId = {};
    const bounds = new window.google.maps.LatLngBounds();

    const stadiumMarker = new window.google.maps.Marker({
      map: mapRef.current,
      position: center,
      label: {
        text: 'STADIUM',
        color: '#202124',
        fontWeight: '700',
        fontSize: '10px',
      },
      title: stadium?.name || 'Stadium',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#34A853',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 1000,
    });
    markersRef.current.push(stadiumMarker);
    bounds.extend(center);

    zoneList.forEach((zone) => {
      const { position: pos, inferred } = generateZonePosition(zone, center, categoryCount);
      positionsByZoneId[zone.id] = pos;
      bounds.extend(pos);

      const pct = percentFull(zone);
      const isGate = zone.category === 'gate';
      const markerColor = zone.is_closed
        ? '#9AA0A6'
        : pct >= 85
          ? '#EA4335'
          : pct >= 70
            ? '#FA7B17'
            : '#34A853';

      const marker = new window.google.maps.Marker({
        map: mapRef.current,
        position: pos,
        title: zone.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isGate ? 10 : 8,
          fillColor: markerColor,
          fillOpacity: inferred ? 0.72 : 0.95,
          strokeColor: '#ffffff',
          strokeWeight: inferred ? 1.5 : 2,
        },
        label: {
          text: isGate
            ? (() => {
                const m = zone.name?.match(/gate\s*([a-z0-9]+)/i);
                return m ? `G-${m[1].toUpperCase()}` : 'GATE';
              })()
            : zone.category?.toUpperCase()?.slice(0, 4) || 'ZONE',
          color: '#202124',
          fontWeight: '700',
          fontSize: '9px',
        },
      });

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="min-width:190px;font-family:system-ui,sans-serif">
            <div style="font-weight:700;margin-bottom:4px">${zone.name}</div>
            <div>Category: ${zone.category}</div>
            <div>Load: ${pct}% (${zone.current_count}/${zone.capacity})</div>
            <div>Wait: ~${zone.wait_minutes || 0} min</div>
            ${inferred ? '<div style="margin-top:4px;color:#b06000;font-size:11px">Approximate map position (inferred)</div>' : ''}
          </div>
        `);
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
      });

      markersRef.current.push(marker);
    });

    if (zoneList.length > 0) {
      mapRef.current.fitBounds(bounds, 70);
    }

    const originPos = positionsByZoneId[originZoneId];
    const destinationPos = positionsByZoneId[destinationZoneId];

    if (!originPos || !destinationPos) {
      onRouteInfo({
        status: 'idle',
        summary: 'Pick a destination to display navigation from your gate.',
      });
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    const routePolylineSymbol = {
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,
      strokeColor: '#1A73E8',
      fillColor: '#1A73E8',
      fillOpacity: 1,
    };

    directionsService.route(
      {
        origin: originPos,
        destination: destinationPos,
        travelMode: window.google.maps.TravelMode.WALKING,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.length) {
          directionsRendererRef.current.setDirections(result);
          const leg = result.routes[0]?.legs?.[0];
          onRouteInfo({
            status: 'ok',
            summary: `${leg?.distance?.text || 'On-campus route'} • ${leg?.duration?.text || 'few minutes'}`,
          });
          return;
        }

        fallbackRouteRef.current = new window.google.maps.Polyline({
          path: [originPos, destinationPos],
          geodesic: true,
          strokeColor: '#1A73E8',
          strokeOpacity: 0.8,
          strokeWeight: 5,
          icons: [{ icon: routePolylineSymbol, offset: '0%', repeat: '36px' }],
          map: mapRef.current,
        });

        let offset = 0;
        routeAnimationTimerRef.current = window.setInterval(() => {
          offset = (offset + 2) % 100;
          fallbackRouteRef.current?.set('icons', [{ icon: routePolylineSymbol, offset: `${offset}%`, repeat: '36px' }]);
        }, 120);

        onRouteInfo({
          status: 'fallback',
          summary: 'Direct route shown between selected points inside stadium.',
        });
      }
    );

    return () => {
      if (routeAnimationTimerRef.current) {
        window.clearInterval(routeAnimationTimerRef.current);
        routeAnimationTimerRef.current = null;
      }
    };
  }, [stadium, zoneList, originZoneId, destinationZoneId, onRouteInfo]);

  return <div ref={mapElementRef} id="map" className="w-full h-full min-h-[420px] rounded-xl overflow-hidden shadow-sm border border-divider" />;
};

const MapComponent = ({ stadium, zones = {}, userTicket, destinationHint = '' }) => {
  const apiKey = import.meta.env.VITE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const zoneList = useMemo(() => Object.values(zones || {}), [zones]);
  const [destinationZoneId, setDestinationZoneId] = useState('');
  const [routeInfo, setRouteInfo] = useState({ status: 'idle', summary: 'Choose a destination to navigate.' });

  const zoneMatchFromHint = useMemo(() => {
    const hint = (destinationHint || '').toLowerCase().trim();
    if (!hint || !zoneList.length) return null;

    const intents = {
      restroom: ['restroom', 'toilet', 'washroom', 'wc'],
      food: ['food', 'kiosk', 'court', 'snack', 'eat'],
      gate: ['gate', 'entry', 'entrance', 'exit'],
      merch: ['merch', 'shop', 'store'],
    };

    let preferredCategory = null;
    Object.entries(intents).forEach(([category, keywords]) => {
      if (preferredCategory) return;
      if (keywords.some((word) => hint.includes(word))) {
        preferredCategory = category;
      }
    });

    const eligible = zoneList.filter((z) => !z.is_closed && (!preferredCategory || z.category === preferredCategory));
    if (!eligible.length) return null;

    const directName = eligible.find((z) => (z.name || '').toLowerCase().includes(hint));
    if (directName) return directName.id;

    const best = [...eligible].sort((a, b) => (a.wait_minutes || 0) - (b.wait_minutes || 0))[0];
    return best?.id || null;
  }, [destinationHint, zoneList]);

  useEffect(() => {
    if (zoneMatchFromHint) {
      setDestinationZoneId(zoneMatchFromHint);
    }
  }, [zoneMatchFromHint]);

  useEffect(() => {
    if (!zoneList.length) {
      setDestinationZoneId('');
      return;
    }
    if (destinationZoneId && zoneList.some((z) => z.id === destinationZoneId)) {
      return;
    }
    const best = [...zoneList]
      .filter((z) => z.category !== 'gate' && !z.is_closed)
      .sort((a, b) => (a.wait_minutes || 0) - (b.wait_minutes || 0))[0];
    setDestinationZoneId(best?.id || zoneList[0]?.id || '');
  }, [zoneList, destinationZoneId]);

  if (!apiKey) {
    return (
      <div className="flex-1 bg-surface-alt relative flex items-center justify-center min-h-[400px] rounded-xl border border-divider">
        <div className="text-center p-6 bg-surface/90 backdrop-blur rounded-2xl m-4 shadow-lg border border-divider max-w-sm">
          <h3 className="font-bold text-lg mb-2 text-danger">Maps Error</h3>
          <p className="text-sm text-on-surfaceSec">Set VITE_MAPS_KEY (or VITE_GOOGLE_MAPS_API_KEY) in frontend env config.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[420px] relative">
      <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur px-3 py-3 rounded-xl border border-divider shadow-sm max-w-[320px]">
        <div className="text-[10px] font-black uppercase tracking-widest text-on-surfaceSec mb-2">Live Navigation</div>
        <div className="text-xs text-on-surface mb-2">
          From: <span className="font-bold">{userTicket?.gate?.replace(/_/g, ' ') || 'Selected Gate'}</span>
        </div>
        <select
          value={destinationZoneId}
          onChange={(e) => setDestinationZoneId(e.target.value)}
          className="w-full bg-surface-alt border border-divider rounded-lg px-3 py-2 text-xs font-semibold"
        >
          {zoneList.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        <p className="text-[11px] text-on-surfaceSec mt-2">{routeInfo.summary}</p>
      </div>

      <Wrapper apiKey={apiKey}>
        <MapCanvas
          stadium={stadium}
          zoneList={zoneList}
          originZoneId={userTicket?.gate}
          destinationZoneId={destinationZoneId}
          onRouteInfo={setRouteInfo}
        />
      </Wrapper>
    </div>
  );
};

export default MapComponent;
