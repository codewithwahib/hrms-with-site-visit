'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DM_Sans } from 'next/font/google';
import Topbar from '@/app/Components/topbar';
import { createClient } from '@supabase/supabase-js';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FiTruck, FiRefreshCw, FiWifi, FiNavigation } from 'react-icons/fi';

const dmsans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ OSM raster tiles
const RASTER_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const DEFAULT_CENTER: [number, number] = [67.0011, 24.8607]; // Karachi

type LiveVan = {
  van_id: string;
  driver_id: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  is_online: boolean;
  last_ping_at: string;
};

export default function LiveTrackingPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const maplibreglRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const [vans, setVans] = useState<LiveVan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [vanDetails, setVanDetails] = useState<Record<string, any>>({});

  // ✅ Fetch van details
  const fetchVanDetails = async () => {
    try {
      const res = await fetch('/api/admin/vans');
      const data = await res.json();
      const map: Record<string, any> = {};
      (data.vans ?? []).forEach((v: any) => {
        map[v.id] = v;
      });
      setVanDetails(map);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Fetch live vans
  const fetchLiveVans = async () => {
    try {
      const res = await fetch('/api/driver/location');
      const data = await res.json();
      setVans(data.vans || []);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVanDetails();
    fetchLiveVans();
  }, []);

  // ✅ Init map (fixed for TS)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    const init = async () => {
      const mod: any = await import('maplibre-gl');
      const maplibregl: any = mod.default || mod;
      if (cancelled) return;
      maplibreglRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: RASTER_STYLE as any,
        center: DEFAULT_CENTER,
        zoom: 11,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
        if (!cancelled) setMapReady(true);
      });

      mapRef.current = map;
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ✅ Update markers
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !mapReady) return;

    const currentIds = new Set(vans.map((v) => v.van_id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add/update
    vans.forEach((v) => {
      const detail = vanDetails[v.van_id];
      const vanLabel = detail?.van_id || v.van_id.slice(0, 8);
      const vehicleNum = detail?.vehicle_number || '';
      const speedText =
        v.speed != null ? `${v.speed.toFixed(0)} km/h` : 'Stationary';

      const popupHTML = `
        <div style="font-family: system-ui; padding: 4px; min-width: 140px;">
          <div style="font-weight: bold; font-size: 14px;">${vanLabel}</div>
          <div style="font-size: 12px; color: #666;">${vehicleNum}</div>
          <div style="font-size: 11px; color: #999; margin-top: 4px;">🚐 ${speedText}</div>
        </div>
      `;

      const existing = markersRef.current.get(v.van_id);

      if (existing) {
        existing.setLngLat([v.longitude, v.latitude]);
        existing.setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(popupHTML)
        );
      } else {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 40px; height: 40px;
          background: #000; color: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          border: 3px solid #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          cursor: pointer;
        `;
        el.textContent = '🚐';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(popupHTML)
          )
          .addTo(map);

        markersRef.current.set(v.van_id, marker);
      }
    });
  }, [vans, mapReady, vanDetails]);

  // ✅ Subscribe to Realtime
  useEffect(() => {
    const channel = supabase
      .channel('van_live_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'van_live_state' },
        (payload: any) => {
          const updated = payload.new as any;
          if (!updated) return;

          setVans((prev) => {
            const exists = prev.find((v) => v.van_id === updated.van_id);
            if (exists) {
              return prev.map((v) =>
                v.van_id === updated.van_id ? { ...v, ...updated } : v
              );
            }
            return [updated, ...prev];
          });
        }
      )
      .subscribe();

    // Backup poll
    const interval = setInterval(fetchLiveVans, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const focusVan = (v: LiveVan) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [v.longitude, v.latitude],
      zoom: 16,
      essential: true,
    });
  };

  return (
    <>
      <Topbar />
      <div className={`bg-white min-h-screen ${dmsans.className}`}>
        {/* Header */}
        <div className="px-4 sm:px-6 md:px-8 py-6 border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black">
                Live Tracking
              </h1>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <FiWifi className="w-3 h-3 text-green-500" />
                {vans.length} van{vans.length !== 1 ? 's' : ''} online
              </p>
            </div>
            <button
              onClick={fetchLiveVans}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm border border-gray-300 hover:border-black transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-0">
          {/* Sidebar */}
          <div className="border-r border-gray-200 max-h-[calc(100vh-140px)] overflow-y-auto">
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  <p className="mt-2 text-xs">Loading...</p>
                </div>
              ) : vans.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <FiTruck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs">No vans sharing location right now</p>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Open /driver/share on the driver&apos;s phone
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vans.map((v) => {
                    const detail = vanDetails[v.van_id];
                    const vanLabel = detail?.van_id || v.van_id.slice(0, 8);
                    const vehicleNum = detail?.vehicle_number || '';

                    return (
                      <button
                        key={v.van_id}
                        onClick={() => focusVan(v)}
                        className="w-full text-left p-3 rounded-sm border border-gray-200 hover:border-black transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <FiTruck className="w-4 h-4 text-black" />
                            <span className="font-semibold text-sm text-black">
                              {vanLabel}
                            </span>
                          </div>
                          <FiWifi className="w-3.5 h-3.5 text-green-500" />
                        </div>
                        {vehicleNum && (
                          <p className="text-xs text-gray-500 mb-2 font-mono">
                            {vehicleNum}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <FiNavigation className="w-2.5 h-2.5" />
                            {v.speed != null
                              ? `${v.speed.toFixed(0)} km/h`
                              : 'Stationary'}
                          </span>
                          <span>
                            {new Date(v.last_ping_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="relative h-[calc(100vh-140px)]">
            <div ref={mapContainerRef} className="w-full h-full" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 pointer-events-none">
                <div className="text-center">
                  <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  <p className="mt-3 text-xs text-gray-500">Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}