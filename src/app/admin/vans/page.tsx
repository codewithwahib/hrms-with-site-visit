'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DM_Sans } from 'next/font/google';
import {
  FiPlus,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiEdit2,
} from 'react-icons/fi';

const dmsans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

type Van = {
  id: string;
  van_id: string;
  vehicle_number: string;
  van_model: string;
  capacity: number;
  current_passengers: number;
  driver_id: string | null;
  driver_assigned: string | null;
  route_assigned: string | null;
  status: 'active' | 'maintenance' | 'out_of_service';
  created_at: string;
  updated_at: string;
};

type VanApiResponse = {
  error?: string;
  message?: string;
  van?: Van;
  vans?: Van[];
};

export default function VansListPage() {
  const [vans, setVans] = useState<Van[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ---------- Fetch Vans ----------
  const fetchVans = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/vans?${params.toString()}`);
      const text = await res.text();
      let data: VanApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Non-JSON response:', text);
        setLoadError(`Server error (${res.status}). Check terminal.`);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setLoadError(data.error || 'Failed to load vans.');
        setIsLoading(false);
        return;
      }

      setVans(data.vans ?? []);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setLoadError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchVans();
  }, [fetchVans]);

  // ---------- Delete ----------
  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete van "${label}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/vans/${id}`, { method: 'DELETE' });
      const text = await res.text();
      let data: VanApiResponse = {};
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

      setVans((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error(err);
      alert('Delete failed.');
    }
  };

  // ---------- Status badge ----------
  const StatusBadge = ({ status }: { status: Van['status'] }) => {
    const styles: Record<Van['status'], string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      out_of_service: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels: Record<Van['status'], string> = {
      active: 'Active',
      maintenance: 'Maintenance',
      out_of_service: 'Out of Service',
    };
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const inputClass =
    'w-full px-4 py-3 text-sm text-black bg-white border border-gray-300 rounded-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition placeholder:text-gray-500';

  return (
    <div
      className={`bg-white min-h-screen px-4 sm:px-6 md:px-8 py-8 sm:py-12 ${dmsans.className}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black tracking-tight">
              Vans
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage the entire fleet
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-white bg-black hover:bg-gray-800 uppercase tracking-wider transition-all duration-200"
          >
            <FiPlus className="w-4 h-4" />
            Add Van
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
              placeholder="Search by Van ID, vehicle number, model, driver..."
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
            <option value="maintenance">Maintenance</option>
            <option value="out_of_service">Out of Service</option>
          </select>
          <button
            onClick={fetchVans}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-sm text-sm font-medium text-black bg-white border border-gray-300 hover:border-black transition-colors"
            aria-label="Refresh"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>

        {/* Error */}
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
                  <th className="px-4 py-3">Van</th>
                  <th className="px-4 py-3">Van ID</th>
                  <th className="px-4 py-3">Vehicle No.</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Passengers</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                      <p className="mt-3 text-xs">Loading vans...</p>
                    </td>
                  </tr>
                ) : vans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No vans found.{' '}
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-black hover:text-gray-600 font-semibold underline"
                      >
                        Add your first van
                      </button>
                    </td>
                  </tr>
                ) : (
                  vans.map((v) => {
                    const occupancyPct =
                      v.capacity > 0
                        ? Math.round((v.current_passengers / v.capacity) * 100)
                        : 0;
                    return (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 text-black flex items-center justify-center font-bold text-xs border border-gray-200">
                              🚐
                            </div>
                            <span className="font-medium text-black">
                              {v.van_model}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                          {v.van_id}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                          {v.vehicle_number}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{v.capacity}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700 whitespace-nowrap">
                              {v.current_passengers}/{v.capacity}
                            </span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  occupancyPct >= 90
                                    ? 'bg-red-500'
                                    : occupancyPct >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {v.driver_assigned || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {v.route_assigned || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/vans/${v.id}`}
                              className="p-2 text-gray-500 hover:text-black transition-colors"
                              aria-label="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() =>
                                handleDelete(v.id, `${v.van_id} (${v.vehicle_number})`)
                              }
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

        {!isLoading && vans.length > 0 && (
          <p className="text-xs text-gray-500 mt-4 text-center sm:text-left">
            Showing {vans.length} van{vans.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {isModalOpen && (
        <AddVanModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchVans();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   ADD VAN MODAL
   ============================================================ */

function AddVanModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    van_id: '',
    vehicle_number: '',
    van_model: '',
    capacity: '',
    current_passengers: '0',
    driver_assigned: '',
    route_assigned: '',
    status: 'active',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const cap = Number(formData.capacity);
    const pass = Number(formData.current_passengers);

    if (isNaN(cap) || cap <= 0) {
      setErrorMsg('Capacity must be greater than 0.');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(pass) || pass < 0) {
      setErrorMsg('Current passengers cannot be negative.');
      setIsSubmitting(false);
      return;
    }
    if (pass > cap) {
      setErrorMsg('Current passengers cannot exceed capacity.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/vans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          van_id: formData.van_id.trim(),
          vehicle_number: formData.vehicle_number.trim().toUpperCase(),
          van_model: formData.van_model.trim(),
          capacity: cap,
          current_passengers: pass,
          driver_assigned: formData.driver_assigned.trim() || null,
          route_assigned: formData.route_assigned.trim() || null,
          status: formData.status,
        }),
      });

      const text = await res.text();
      let data: VanApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Non-JSON response:', text);
        setErrorMsg(`Server error (${res.status}). Check terminal.`);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create van.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Van registered successfully!');
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

  return (
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
              Register Van
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill in the details below to add a new van
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 sm:space-y-5">
          {/* Van ID + Vehicle Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>
                Van ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="van_id"
                value={formData.van_id}
                onChange={handleChange}
                placeholder="e.g. VAN-001"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                placeholder="e.g. LE-1234"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Van Model + Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>
                Van Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="van_model"
                value={formData.van_model}
                onChange={handleChange}
                placeholder="e.g. Toyota Hiace 2020"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="e.g. 14"
                min={1}
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Current Passengers + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>Current Passengers</label>
              <input
                type="number"
                name="current_passengers"
                value={formData.current_passengers}
                onChange={handleChange}
                placeholder="0"
                min={0}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
          </div>

          {/* Driver + Route */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>Driver Assigned</label>
              <input
                type="text"
                name="driver_assigned"
                value={formData.driver_assigned}
                onChange={handleChange}
                placeholder="e.g. Muhammad Imran"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Route Assigned</label>
              <input
                type="text"
                name="route_assigned"
                value={formData.route_assigned}
                onChange={handleChange}
                placeholder="e.g. Route A - Johar Town"
                className={inputClass}
              />
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <p className="text-center text-xs sm:text-sm text-red-600">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-center text-xs sm:text-sm text-black font-semibold">
              {successMsg}
            </p>
          )}

          {/* Footer buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3">
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
              {isSubmitting ? 'Registering...' : 'REGISTER VAN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}