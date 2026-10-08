'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DM_Sans } from 'next/font/google';
import {
  FiNavigation,
  FiMapPin,
  FiWifi,
  FiWifiOff,
  FiActivity,
} from 'react-icons/fi';

const dmsans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

export default function DriverSharePage() {
  const [vanId, setVanId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<{
    lat: number;
    lng: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
  } | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [error, setError] = useState('');
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null);
  const [vans, setVans] = useState<any[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestPosRef = useRef<GeolocationPosition | null>(null);

  // ✅ Load vans list
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/vans');
        const data = await res.json();
        setVans((data.vans ?? []).filter((v: any) => v.status === 'active'));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // ✅ Send location
  const sendLocation = async (pos: GeolocationPosition) => {
    if (!vanId) return;

    const { latitude, longitude, speed, heading, accuracy } = pos.coords;

    try {
      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          van_id: vanId,
          driver_id: driverId || null,
          latitude,
          longitude,
          speed: speed != null ? speed * 3.6 : null, // m/s → km/h
          heading: heading ?? null,
          accuracy: accuracy ?? null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Failed to send');
        return;
      }

      setLastLocation({
        lat: latitude,
        lng: longitude,
        speed: speed != null ? speed * 3.6 : null,
        heading: heading ?? null,
        accuracy: accuracy ?? null,
      });
      setPingCount((c) => c + 1);
      setLastPingAt(new Date());
      setError('');
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  };

  // ✅ Start tracking
  const startTracking = () => {
    if (!vanId) {
      setError('Please select a van first.');
      return;
    }

    if (!navigator.geolocation) {
      setError('GPS not supported.');
      return;
    }

    setError('');
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPosRef.current = pos;
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied.');
          stopTracking();
        } else {
          setError('GPS error. Move to open area.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    intervalRef.current = setInterval(() => {
      if (latestPosRef.current) sendLocation(latestPosRef.current);
    }, 2000);

    // First ping immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latestPosRef.current = pos;
        sendLocation(pos);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  };

  // ✅ Stop
  const stopTracking = () => {
    setIsTracking(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (vanId) {
      fetch('/api/driver/location', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ van_id: vanId }),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className={`min-h-screen bg-white px-4 py-8 ${dmsans.className}`}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-black">Share Live Location</h1>
          <p className="text-xs text-gray-500 mt-1">
            Broadcast your van&apos;s location every 2s
          </p>
        </div>

        {/* Van + Driver Selection */}
        {!isTracking && (
          <div className="border border-gray-200 rounded-lg p-5 bg-white mb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Select Van
              </label>
              <select
                value={vanId}
                onChange={(e) => setVanId(e.target.value)}
                className="w-full px-4 py-3 text-sm text-black bg-white border border-gray-300 rounded-sm focus:border-black focus:outline-none"
              >
                <option value="">— Choose a van —</option>
                {vans.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.van_id} — {v.vehicle_number} ({v.van_model})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Driver ID (optional)
              </label>
              <input
                type="text"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                placeholder="UUID or leave blank"
                className="w-full px-4 py-3 text-sm text-black bg-white border border-gray-300 rounded-sm focus:border-black focus:outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isTracking ? (
                <>
                  <FiWifi className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">
                    LIVE
                  </span>
                </>
              ) : (
                <>
                  <FiWifiOff className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-500">
                    OFFLINE
                  </span>
                </>
              )}
            </div>
            {isTracking && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <FiActivity className="w-3 h-3" />
                {pingCount} pings
              </div>
            )}
          </div>

          {lastLocation ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <FiMapPin className="w-3.5 h-3.5" />
                <span className="font-mono">
                  {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Speed</p>
                  <p className="text-sm font-bold text-black">
                    {lastLocation.speed != null
                      ? lastLocation.speed.toFixed(0)
                      : '—'}{' '}
                    <span className="text-[10px] font-normal">km/h</span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Heading</p>
                  <p className="text-sm font-bold text-black">
                    {lastLocation.heading != null
                      ? `${lastLocation.heading.toFixed(0)}°`
                      : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Accuracy</p>
                  <p className="text-sm font-bold text-black">
                    {lastLocation.accuracy != null
                      ? lastLocation.accuracy.toFixed(0)
                      : '—'}{' '}
                    <span className="text-[10px] font-normal">m</span>
                  </p>
                </div>
              </div>
              {lastPingAt && (
                <p className="text-[10px] text-gray-400 text-center pt-2">
                  Last update: {lastPingAt.toLocaleTimeString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">
              {isTracking
                ? 'Waiting for GPS signal...'
                : 'Select a van and tap START'}
            </p>
          )}

          {error && (
            <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full py-4 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
            isTracking
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-black hover:bg-gray-800 text-white'
          }`}
        >
          {isTracking ? 'STOP SHARING' : 'START SHARING LOCATION'}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <FiNavigation className="w-3 h-3" />
          <span>Updates every 2 seconds</span>
        </div>
      </div>
    </div>
  );
}