'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Topbar from '@/app/Components/topbar';
import { DM_Sans } from 'next/font/google';
import {
  FiPlus,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiEdit2,
  FiMapPin,
} from 'react-icons/fi';

const dmsans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const MapPicker = dynamic(() => import('@/app/Components/MapPicker'), {
  ssr: false,
});

// ✅ all_stops objects shape
type StopItem = {
  name: string;
  lat: number | null;
  lng: number | null;
};

// ✅ legacy support (string stops) — for old routes
type StopRaw = string | StopItem;

type Route = {
  id: string;
  route_id: string;
  route_name: string;
  starting_point: string;
  starting_latitude: number | null;
  starting_longitude: number | null;
  ending_point: string;
  ending_latitude: number | null;
  ending_longitude: number | null;
  all_stops: StopRaw[];
  stop_timings: string[];
  assigned_van_id: string | null;
  assigned_driver_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

type VanOption = {
  id: string;
  van_id: string;
  vehicle_number: string;
  van_model: string;
  status: string;
};

type DriverOption = {
  id: string;
  driver_id: string;
  full_name: string;
  status: string;
};

type RouteApiResponse = {
  error?: string;
  message?: string;
  route?: Route;
  routes?: Route[];
};

// ✅ Helper: convert raw stop to display name
const getStopName = (s: StopRaw): string =>
  typeof s === 'string' ? s : s.name ?? '';

// ✅ Helper: get stop coords
const getStopCoords = (s: StopRaw): { lat: number | null; lng: number | null } =>
  typeof s === 'string' ? { lat: null, lng: null } : { lat: s.lat, lng: s.lng };

export default function RoutesListPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalState, setModalState] = useState<
    { mode: 'add' } | { mode: 'edit'; route: Route } | null
  >(null);

  const [vansMap, setVansMap] = useState<Record<string, VanOption>>({});
  const [driversMap, setDriversMap] = useState<Record<string, DriverOption>>({});

  const fetchLookups = useCallback(async () => {
    try {
      const [vansRes, driversRes] = await Promise.all([
        fetch('/api/admin/vans'),
        fetch('/api/admin/drivers'),
      ]);

      if (vansRes.ok) {
        const vansData = await vansRes.json();
        const map: Record<string, VanOption> = {};
        (vansData.vans ?? []).forEach((v: VanOption) => {
          map[v.id] = v;
        });
        setVansMap(map);
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        const map: Record<string, DriverOption> = {};
        (driversData.drivers ?? []).forEach((d: DriverOption) => {
          map[d.id] = d;
        });
        setDriversMap(map);
      }
    } catch (err) {
      console.error('Lookup fetch error:', err);
    }
  }, []);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/routes?${params.toString()}`);
      const text = await res.text();
      let data: RouteApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Non-JSON response:', text);
        setLoadError(`Server error (${res.status}). Check terminal.`);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setLoadError(data.error || 'Failed to load routes.');
        setIsLoading(false);
        return;
      }

      setRoutes(data.routes ?? []);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setLoadError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete route "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/routes?id=${id}`, {
        method: 'DELETE',
      });
      const text = await res.text();
      let data: RouteApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        alert('Delete failed: server error');
        return;
      }

      if (!res.ok) {
        alert(data.error || 'Delete failed.');
        return;
      }

      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      alert('Delete failed.');
    }
  };

  const StatusBadge = ({ status }: { status: Route['status'] }) => {
    const styles: Record<Route['status'], string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {status === 'active' ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const inputClass =
    'w-full px-4 py-3 text-sm text-black bg-white border border-gray-300 rounded-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition placeholder:text-gray-500';

  return (
    <>
      <Topbar />

      <div
        className={`bg-white min-h-screen px-4 sm:px-6 md:px-8 py-8 sm:py-12 ${dmsans.className}`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black tracking-tight">
                Routes
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Manage all transport routes with GPS coordinates
              </p>
            </div>
            <button
              onClick={() => setModalState({ mode: 'add' })}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-white bg-black hover:bg-gray-800 uppercase tracking-wider transition-all duration-200"
            >
              <FiPlus className="w-4 h-4" />
              Add Route
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Route ID, name, or stops..."
                className={`${inputClass} pl-10`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputClass} sm:w-48`}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={fetchRoutes}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-sm text-sm font-medium text-black bg-white border border-gray-300 hover:border-black transition-colors"
              aria-label="Refresh"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>

          {loadError && (
            <div className="mb-4 p-4 rounded-sm bg-red-50 border border-red-200 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {/* Table */}
          <div className="border border-gray-200 rounded-sm overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Route ID</th>
                    <th className="px-4 py-3">From → To</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Stops</th>
                    <th className="px-4 py-3">Van</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                        <p className="mt-3 text-xs">Loading routes...</p>
                      </td>
                    </tr>
                  ) : routes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        No routes found.{' '}
                        <button
                          onClick={() => setModalState({ mode: 'add' })}
                          className="text-black hover:text-gray-600 font-semibold underline"
                        >
                          Add your first route
                        </button>
                      </td>
                    </tr>
                  ) : (
                    routes.map((r) => {
                      const van = r.assigned_van_id ? vansMap[r.assigned_van_id] : null;
                      const driver = r.assigned_driver_id
                        ? driversMap[r.assigned_driver_id]
                        : null;
                      const hasStartCoords =
                        r.starting_latitude !== null &&
                        r.starting_longitude !== null;
                      const hasEndCoords =
                        r.ending_latitude !== null && r.ending_longitude !== null;

                      return (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-100 text-black flex items-center justify-center border border-gray-200">
                                <FiMapPin className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-black">
                                {r.route_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                            {r.route_id}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="flex flex-col">
                              <span className="text-xs">{r.starting_point}</span>
                              <span className="text-xs text-gray-400">→</span>
                              <span className="text-xs">{r.ending_point}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="flex flex-col gap-1">
                              {hasStartCoords ? (
                                <a
                                  href={`https://www.google.com/maps?q=${r.starting_latitude},${r.starting_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-black hover:underline font-mono"
                                >
                                  📍 {r.starting_latitude?.toFixed(4)},{' '}
                                  {r.starting_longitude?.toFixed(4)}
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  No start GPS
                                </span>
                              )}
                              {hasEndCoords ? (
                                <a
                                  href={`https://www.google.com/maps?q=${r.ending_latitude},${r.ending_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-black hover:underline font-mono"
                                >
                                  🏁 {r.ending_latitude?.toFixed(4)},{' '}
                                  {r.ending_longitude?.toFixed(4)}
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  No end GPS
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {Array.isArray(r.all_stops) && r.all_stops.length > 0 ? (
                              <span className="text-xs">
                                {r.all_stops.length} stop
                                {r.all_stops.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {van ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-black">
                                  {van.van_id}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {van.vehicle_number}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {driver ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-black">
                                  {driver.full_name}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {driver.driver_id}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setModalState({ mode: 'edit', route: r })}
                                className="p-2 text-gray-500 hover:text-black transition-colors"
                                aria-label="Edit"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(r.id, r.route_name)}
                                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                                aria-label="Delete"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!isLoading && routes.length > 0 && (
            <p className="text-xs text-gray-500 mt-4 text-center sm:text-left">
              Showing {routes.length} route{routes.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {modalState && (
          <RouteModal
            mode={modalState.mode}
            initialRoute={modalState.mode === 'edit' ? modalState.route : null}
            onClose={() => setModalState(null)}
            onSuccess={() => {
              setModalState(null);
              fetchRoutes();
            }}
          />
        )}
      </div>
    </>
  );
}

/* ============================================================
   ROUTE MODAL — Add / Edit with MAP PICKER + per-stop GPS
   ============================================================ */

function RouteModal({
  mode,
  initialRoute,
  onClose,
  onSuccess,
}: {
  mode: 'add' | 'edit';
  initialRoute: Route | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = mode === 'edit';

  const [formData, setFormData] = useState({
    route_id: initialRoute?.route_id ?? '',
    route_name: initialRoute?.route_name ?? '',
    starting_point: initialRoute?.starting_point ?? '',
    starting_latitude:
      initialRoute?.starting_latitude !== null &&
      initialRoute?.starting_latitude !== undefined
        ? String(initialRoute.starting_latitude)
        : '',
    starting_longitude:
      initialRoute?.starting_longitude !== null &&
      initialRoute?.starting_longitude !== undefined
        ? String(initialRoute.starting_longitude)
        : '',
    ending_point: initialRoute?.ending_point ?? '',
    ending_latitude:
      initialRoute?.ending_latitude !== null &&
      initialRoute?.ending_latitude !== undefined
        ? String(initialRoute.ending_latitude)
        : '',
    ending_longitude:
      initialRoute?.ending_longitude !== null &&
      initialRoute?.ending_longitude !== undefined
        ? String(initialRoute.ending_longitude)
        : '',
    assigned_van_id: initialRoute?.assigned_van_id ?? '',
    assigned_driver_id: initialRoute?.assigned_driver_id ?? '',
    status: initialRoute?.status ?? 'active',
  });

  // ✅ Stops now carry name + timing + lat + lng
  const [stops, setStops] = useState<
    { stop: string; timing: string; lat: string; lng: string }[]
  >(() => {
    if (initialRoute) {
      const raw = initialRoute.all_stops ?? [];
      const t = initialRoute.stop_timings ?? [];
      const max = Math.max(raw.length, t.length, 1);
      return Array.from({ length: max }, (_, i) => {
        const item = raw[i];
        const name = item ? getStopName(item) : '';
        const coords = item ? getStopCoords(item) : { lat: null, lng: null };
        return {
          stop: name,
          timing: t[i] ?? '',
          lat: coords.lat !== null && coords.lat !== undefined ? String(coords.lat) : '',
          lng: coords.lng !== null && coords.lng !== undefined ? String(coords.lng) : '',
        };
      });
    }
    return [{ stop: '', timing: '', lat: '', lng: '' }];
  });

  const [vansList, setVansList] = useState<VanOption[]>([]);
  const [driversList, setDriversList] = useState<DriverOption[]>([]);
  const [isLookupLoading, setIsLookupLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ✅ Which location are we picking? start / end / stop index
  const [mapPickerFor, setMapPickerFor] = useState<
    'start' | 'end' | { stopIndex: number } | null
  >(null);

  useEffect(() => {
    const load = async () => {
      setIsLookupLoading(true);
      try {
        const [vansRes, driversRes] = await Promise.all([
          fetch('/api/admin/vans'),
          fetch('/api/admin/drivers'),
        ]);

        if (vansRes.ok) {
          const vansData = await vansRes.json();
          setVansList(
            (vansData.vans ?? []).filter((v: VanOption) => v.status === 'active')
          );
        }

        if (driversRes.ok) {
          const driversData = await driversRes.json();
          setDriversList(
            (driversData.drivers ?? []).filter(
              (d: DriverOption) => d.status === 'active'
            )
          );
        }
      } catch (err) {
        console.error('Lookup load error:', err);
      }
      setIsLookupLoading(false);
    };
    load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const handleMapConfirm = (lat: number, lng: number) => {
    if (mapPickerFor === 'start') {
      setFormData((prev) => ({
        ...prev,
        starting_latitude: String(lat),
        starting_longitude: String(lng),
      }));
    } else if (mapPickerFor === 'end') {
      setFormData((prev) => ({
        ...prev,
        ending_latitude: String(lat),
        ending_longitude: String(lng),
      }));
    } else if (
      mapPickerFor &&
      typeof mapPickerFor === 'object' &&
      'stopIndex' in mapPickerFor
    ) {
      const idx = mapPickerFor.stopIndex;
      setStops((prev) =>
        prev.map((s, i) =>
          i === idx ? { ...s, lat: String(lat), lng: String(lng) } : s
        )
      );
    }
    setMapPickerFor(null);
  };

  const addStopRow = () => {
    setStops((prev) => [...prev, { stop: '', timing: '', lat: '', lng: '' }]);
  };

  const removeStopRow = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStop = (
    index: number,
    field: 'stop' | 'timing' | 'lat' | 'lng',
    value: string
  ) => {
    setStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const parseNum = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    // ✅ Only keep stops with a name
    const cleanStops = stops
      .filter((s) => s.stop.trim() !== '')
      .map((s) => ({
        name: s.stop.trim(),
        lat: parseNum(s.lat),
        lng: parseNum(s.lng),
      }));

    const cleanTimings = stops
      .filter((s) => s.stop.trim() !== '')
      .map((s) => s.timing.trim());

    const payload = {
      route_id: formData.route_id.trim(),
      route_name: formData.route_name.trim(),
      starting_point: formData.starting_point.trim(),
      starting_latitude: parseNum(formData.starting_latitude),
      starting_longitude: parseNum(formData.starting_longitude),
      ending_point: formData.ending_point.trim(),
      ending_latitude: parseNum(formData.ending_latitude),
      ending_longitude: parseNum(formData.ending_longitude),
      all_stops: cleanStops,          // ✅ objects with name+lat+lng
      stop_timings: cleanTimings,     // ✅ parallel strings
      assigned_van_id: formData.assigned_van_id || null,
      assigned_driver_id: formData.assigned_driver_id || null,
      status: formData.status,
    };

    try {
      const url = isEdit
        ? `/api/admin/routes?id=${initialRoute!.id}`
        : '/api/admin/routes';

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: RouteApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Non-JSON response:', text);
        setErrorMsg(`Server error (${res.status}). Check terminal.`);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(
          data.error || `Failed to ${isEdit ? 'update' : 'create'} route.`
        );
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(
        isEdit
          ? 'Route updated successfully!'
          : 'Route registered successfully!'
      );
      setIsSubmitting(false);

      setTimeout(() => {
        onSuccess();
      }, 900);
    } catch (err) {
      console.error(err);
      setErrorMsg('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base text-black bg-white border border-gray-300 rounded-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition placeholder:text-gray-500';

  const labelClass = 'block text-xs sm:text-sm font-medium text-gray-700 mb-1.5';

  const hasStartCoords =
    formData.starting_latitude.trim() !== '' &&
    formData.starting_longitude.trim() !== '';
  const hasEndCoords =
    formData.ending_latitude.trim() !== '' &&
    formData.ending_longitude.trim() !== '';

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl my-8 sm:my-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black">
                {isEdit ? 'Edit Route' : 'Register Route'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEdit
                  ? `Update details for ${initialRoute?.route_name}`
                  : 'Add route with stops, timings, and GPS locations'}
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

          {/* Body */}
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 sm:space-y-5 max-h-[70vh] overflow-y-auto"
          >
            {/* Route ID + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelClass}>
                  Route ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="route_id"
                  value={formData.route_id}
                  onChange={handleChange}
                  placeholder="e.g. RT-001"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Route Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="route_name"
                  value={formData.route_name}
                  onChange={handleChange}
                  placeholder="e.g. Johar Town Route"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* STARTING POINT */}
            <div className="border border-gray-200 rounded-sm p-4 space-y-3 bg-gray-50">
              <div>
                <label className={labelClass}>
                  Starting Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="starting_point"
                  value={formData.starting_point}
                  onChange={handleChange}
                  placeholder="e.g. Main Gate"
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Starting Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="starting_latitude"
                    value={formData.starting_latitude}
                    onChange={handleChange}
                    placeholder="e.g. 31.5204"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Starting Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="starting_longitude"
                    value={formData.starting_longitude}
                    onChange={handleChange}
                    placeholder="e.g. 74.3587"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMapPickerFor('start')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold text-white bg-black hover:bg-gray-800 transition-colors"
                >
                  <FiMapPin className="w-3.5 h-3.5" />
                  Pick on Map
                </button>

                {hasStartCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${formData.starting_latitude},${formData.starting_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-black hover:underline font-medium"
                  >
                    📍 View on Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* ENDING POINT */}
            <div className="border border-gray-200 rounded-sm p-4 space-y-3 bg-gray-50">
              <div>
                <label className={labelClass}>
                  Ending Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ending_point"
                  value={formData.ending_point}
                  onChange={handleChange}
                  placeholder="e.g. Campus Block A"
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Ending Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="ending_latitude"
                    value={formData.ending_latitude}
                    onChange={handleChange}
                    placeholder="e.g. 31.4700"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ending Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="ending_longitude"
                    value={formData.ending_longitude}
                    onChange={handleChange}
                    placeholder="e.g. 74.4100"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMapPickerFor('end')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold text-white bg-black hover:bg-gray-800 transition-colors"
                >
                  <FiMapPin className="w-3.5 h-3.5" />
                  Pick on Map
                </button>

                {hasEndCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${formData.ending_latitude},${formData.ending_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-black hover:underline font-medium"
                  >
                    🏁 View on Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* Assign Van + Driver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelClass}>Assign Van</label>
                <select
                  name="assigned_van_id"
                  value={formData.assigned_van_id}
                  onChange={handleChange}
                  disabled={isLookupLoading}
                  className={inputClass}
                >
                  <option value="">— None (Unassigned) —</option>
                  {vansList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.van_id} — {v.vehicle_number} ({v.van_model})
                    </option>
                  ))}
                </select>
                {!isLookupLoading && vansList.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No active vans available
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Assign Driver</label>
                <select
                  name="assigned_driver_id"
                  value={formData.assigned_driver_id}
                  onChange={handleChange}
                  disabled={isLookupLoading}
                  className={inputClass}
                >
                  <option value="">— None (Unassigned) —</option>
                  {driversList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.driver_id} — {d.full_name}
                    </option>
                  ))}
                </select>
                {!isLookupLoading && driversList.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No active drivers available
                  </p>
                )}
              </div>
            </div>

            {/* Stops & Timings + per-stop GPS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + ' mb-0'}>
                  Stops, Timings &amp; GPS
                </label>
                <button
                  type="button"
                  onClick={addStopRow}
                  className="text-xs font-semibold text-black hover:text-gray-600 transition-colors inline-flex items-center gap-1"
                >
                  <FiPlus className="w-3.5 h-3.5" /> Add Stop
                </button>
              </div>

              <div className="space-y-3">
                {stops.map((s, i) => {
                  const hasCoords =
                    s.lat.trim() !== '' && s.lng.trim() !== '';
                  return (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-sm p-3 bg-gray-50 space-y-2"
                    >
                      {/* Row 1: stop name + timing + remove */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-2 items-center">
                        <input
                          type="text"
                          value={s.stop}
                          onChange={(e) => updateStop(i, 'stop', e.target.value)}
                          placeholder={`Stop ${i + 1} name`}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={s.timing}
                          onChange={(e) =>
                            updateStop(i, 'timing', e.target.value)
                          }
                          placeholder="e.g. 07:30 AM"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => removeStopRow(i)}
                          disabled={stops.length === 1}
                          className="justify-self-end sm:justify-self-auto p-2 rounded-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Remove stop"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Row 2: lat + lng + pick on map */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-2 items-center">
                        <input
                          type="number"
                          step="any"
                          value={s.lat}
                          onChange={(e) => updateStop(i, 'lat', e.target.value)}
                          placeholder="Latitude"
                          className={inputClass}
                        />
                        <input
                          type="number"
                          step="any"
                          value={s.lng}
                          onChange={(e) => updateStop(i, 'lng', e.target.value)}
                          placeholder="Longitude"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setMapPickerFor({ stopIndex: i })}
                          className="justify-self-end sm:justify-self-auto inline-flex items-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-semibold text-white bg-black hover:bg-gray-800 transition-colors whitespace-nowrap"
                        >
                          <FiMapPin className="w-3.5 h-3.5" />
                          Pick
                        </button>
                      </div>

                      {hasCoords && (
                        <a
                          href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-black hover:underline font-medium inline-block"
                        >
                          📍 View Stop {i + 1} on Google Maps
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Stops with empty names will be skipped automatically.
              </p>
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Messages */}
            {errorMsg && (
              <p className="text-center text-xs sm:text-sm text-red-600">
                {errorMsg}
              </p>
            )}
            {successMsg && (
              <p className="text-center text-xs sm:text-sm text-black font-semibold">
                {successMsg}
              </p>
            )}

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-black bg-gray-100 hover:bg-gray-200 uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isSubmitting
                  ? isEdit
                    ? 'Updating...'
                    : 'Registering...'
                  : isEdit
                  ? 'UPDATE ROUTE'
                  : 'REGISTER ROUTE'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Map Picker — handles start / end / any stop */}
      <MapPicker
        isOpen={mapPickerFor !== null}
        initialLat={
          mapPickerFor === 'start'
            ? parseNum(formData.starting_latitude)
            : mapPickerFor === 'end'
            ? parseNum(formData.ending_latitude)
            : mapPickerFor && typeof mapPickerFor === 'object'
            ? parseNum(stops[mapPickerFor.stopIndex]?.lat ?? '')
            : null
        }
        initialLng={
          mapPickerFor === 'start'
            ? parseNum(formData.starting_longitude)
            : mapPickerFor === 'end'
            ? parseNum(formData.ending_longitude)
            : mapPickerFor && typeof mapPickerFor === 'object'
            ? parseNum(stops[mapPickerFor.stopIndex]?.lng ?? '')
            : null
        }
        onClose={() => setMapPickerFor(null)}
        onConfirm={handleMapConfirm}
        title={
          mapPickerFor === 'start'
            ? 'Pick Starting Location'
            : mapPickerFor === 'end'
            ? 'Pick Ending Location'
            : mapPickerFor && typeof mapPickerFor === 'object'
            ? `Pick Stop ${mapPickerFor.stopIndex + 1} Location`
            : 'Pick Location'
        }
      />
    </>
  );
}