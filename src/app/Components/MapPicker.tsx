'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FiX, FiSearch, FiMapPin } from 'react-icons/fi';

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

// ✅ Karachi focus
const KARACHI_CENTER = { lat: 24.8607, lng: 67.0011 };
const DEFAULT_CENTER: [number, number] = [67.0011, 24.8607];

type SearchResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  source?: string;
};

type Props = {
  isOpen: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  title?: string;
};

export default function MapPicker({
  isOpen,
  initialLat,
  initialLng,
  onClose,
  onConfirm,
  title = 'Pick Location',
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const maplibreglRef = useRef<any>(null);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat !== null &&
      initialLat !== undefined &&
      initialLng !== null &&
      initialLng !== undefined
      ? { lat: initialLat, lng: initialLng }
      : null
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (
      initialLat !== null &&
      initialLat !== undefined &&
      initialLng !== null &&
      initialLng !== undefined
    ) {
      setPosition({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ✅ Init map (TS fixed)
  useEffect(() => {
    if (!isOpen) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const maplibreglModule: any = await import('maplibre-gl');
      const maplibregl: any = maplibreglModule.default || maplibreglModule;

      if (cancelled) return;
      maplibreglRef.current = maplibregl;

      const startCenter: [number, number] = position
        ? [position.lng, position.lat]
        : DEFAULT_CENTER;

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: RASTER_STYLE as any,
        center: startCenter,
        zoom: position ? 15 : 12,
        attributionControl: true,
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        'top-right'
      );

      if (position) {
        const marker = new maplibregl.Marker({ color: '#000' })
          .setLngLat([position.lng, position.lat])
          .addTo(map);
        markerRef.current = marker;
      }

      map.on('click', (e: any) => {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;

        setPosition({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          const marker = new maplibregl.Marker({ color: '#000' })
            .setLngLat([lng, lat])
            .addTo(map);
          markerRef.current = marker;
        }
      });

      map.on('load', () => {
        if (!cancelled) setMapReady(true);
      });

      setTimeout(() => {
        if (!cancelled) setMapReady(true);
      }, 2000);

      mapRef.current = map;
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !position || !maplibregl) return;

    map.flyTo({
      center: [position.lng, position.lat],
      zoom: 16,
      essential: true,
    });

    if (markerRef.current) {
      markerRef.current.setLngLat([position.lng, position.lat]);
    } else {
      const marker = new maplibregl.Marker({ color: '#000' })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
      markerRef.current = marker;
    }
  }, [position]);

  // ✅ Search via server API (Foursquare + Photon)
  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const res = await fetch(
        `/api/places-search?q=${encodeURIComponent(query)}`
      );

      const data = await res.json();

      if (!res.ok) {
        setSearchResults([]);
        setSearchError(data.error || 'Search failed.');
        setShowDropdown(true);
        setIsSearching(false);
        return;
      }

      const results: SearchResult[] = (data.results || []).filter(
        (r: SearchResult) =>
          r.lat && r.lng && !isNaN(Number(r.lat)) && !isNaN(Number(r.lng))
      );

      setSearchResults(results);
      setShowDropdown(true);
      setIsSearching(false);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
      setSearchError('Network error. Try again.');
      setShowDropdown(true);
      setIsSearching(false);
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setShowDropdown(true);
    setIsSearching(true);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 400);
  };

  const handleSelectResult = (result: SearchResult) => {
    setPosition({ lat: Number(result.lat), lng: Number(result.lng) });
    setSearchQuery(result.name + (result.address ? `, ${result.address}` : ''));
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchSuggestions(searchQuery);
  };

  const shorten = (s: string, maxLen = 75) =>
    s.length <= maxLen ? s : s.slice(0, maxLen) + '…';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-black">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Search in Karachi or click on the map
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="relative" ref={searchWrapperRef}>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Search shop, restaurant, pharmacy..."
                  autoComplete="off"
                  className="w-full pl-10 pr-10 py-2.5 text-sm text-black bg-white border border-gray-300 rounded-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 rounded-sm text-xs font-bold text-white bg-black hover:bg-gray-800 uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </form>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-20 max-h-80 overflow-y-auto">
                {isSearching && searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-500 text-center">
                    No results found. Try a different search.
                  </div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectResult(r)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {shorten(r.name, 55)}
                        </p>
                        {r.address && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {shorten(r.address, 80)}
                          </p>
                        )}
                      </div>
                      {r.source === 'foursquare' && (
                        <span className="text-[10px] text-blue-500 font-medium uppercase tracking-wider mt-0.5">
                          FSQ
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {searchError && (
            <p className="text-xs text-red-600 mt-2">{searchError}</p>
          )}
        </div>

        <div className="w-full h-[400px] sm:h-[450px] relative bg-gray-100">
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

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs sm:text-sm text-gray-700">
            {position ? (
              <span className="font-mono">
                📍 <strong>{position.lat.toFixed(6)}</strong>,{' '}
                <strong>{position.lng.toFixed(6)}</strong>
              </span>
            ) : (
              <span className="text-gray-500 italic">
                No location selected yet — click on the map
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-bold text-black bg-gray-100 hover:bg-gray-200 uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (position) onConfirm(position.lat, position.lng);
              }}
              disabled={!position}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                position
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}