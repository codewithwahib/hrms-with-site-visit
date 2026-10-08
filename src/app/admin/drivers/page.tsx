'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DM_Sans } from 'next/font/google';
import {
  FiPlus,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiEdit2,
  FiUploadCloud,
} from 'react-icons/fi';
import { createClient } from '@supabase/supabase-js';

const dmsans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

// ✅ Supabase client for storage uploads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET_NAME = 'drivers-image';

type Driver = {
  id: string;
  driver_id: string;
  full_name: string;
  profile_image: string | null;
  cnic: string;
  phone_number: string;
  emergency_contact: string;
  driving_license: string;
  license_expiry_date: string;
  assigned_van_id: string | null;
  assigned_route_id: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  created_at: string;
  updated_at: string;
};

type DriverApiResponse = {
  error?: string;
  message?: string;
  driver?: Driver;
  drivers?: Driver[];
};

export default function DriversListPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/drivers?${params.toString()}`);
      const text = await res.text();
      let data: DriverApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Non-JSON response:', text);
        setLoadError(`Server error (${res.status}). Check terminal.`);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setLoadError(data.error || 'Failed to load drivers.');
        setIsLoading(false);
        return;
      }

      setDrivers(data.drivers ?? []);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setLoadError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete driver "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/drivers/${id}`, { method: 'DELETE' });
      const text = await res.text();
      let data: DriverApiResponse = {};
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

      setDrivers((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      alert('Delete failed.');
    }
  };

  const StatusBadge = ({ status }: { status: Driver['status'] }) => {
    const styles: Record<Driver['status'], string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-gray-100 text-gray-700 border-gray-200',
      on_leave: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    const labels: Record<Driver['status'], string> = {
      active: 'Active',
      inactive: 'Inactive',
      on_leave: 'On Leave',
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
              Drivers
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage all registered drivers
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full text-xs sm:text-sm font-bold text-white bg-black hover:bg-gray-800 uppercase tracking-wider transition-all duration-200"
          >
            <FiPlus className="w-4 h-4" />
            Add Driver
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
              placeholder="Search by name, ID, CNIC, phone, license..."
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
            <option value="on_leave">On Leave</option>
          </select>
          <button
            onClick={fetchDrivers}
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
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Driver ID</th>
                  <th className="px-4 py-3">CNIC</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                      <p className="mt-3 text-xs">Loading drivers...</p>
                    </td>
                  </tr>
                ) : drivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      No drivers found.{' '}
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-black hover:text-gray-600 font-semibold underline"
                      >
                        Add your first driver
                      </button>
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {d.profile_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={d.profile_image}
                              alt={d.full_name}
                              className="w-9 h-9 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-100 text-black flex items-center justify-center font-bold text-xs border border-gray-200">
                              {d.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-black">{d.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {d.driver_id}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{d.cnic}</td>
                      <td className="px-4 py-3 text-gray-700">{d.phone_number}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {d.driving_license}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(d.license_expiry_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/drivers/${d.id}`}
                            className="p-2 text-gray-500 hover:text-black transition-colors"
                            aria-label="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(d.id, d.full_name)}
                            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                            aria-label="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isLoading && drivers.length > 0 && (
          <p className="text-xs text-gray-500 mt-4 text-center sm:text-left">
            Showing {drivers.length} driver{drivers.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {isModalOpen && (
        <AddDriverModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchDrivers();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   ADD DRIVER MODAL — white theme + image upload
   ============================================================ */

function AddDriverModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    driver_id: '',
    full_name: '',
    profile_image: '',
    cnic: '',
    phone_number: '',
    emergency_contact: '',
    driving_license: '',
    license_expiry_date: '',
    status: 'active',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ✅ Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5 MB.');
      return;
    }

    setErrorMsg('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${fileExt}`;
    const filePath = `drivers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(uploadError.message);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    let uploadedUrl: string | null = null;

    try {
      if (imageFile) {
        setIsUploading(true);
        uploadedUrl = await uploadImage(imageFile);
        setIsUploading(false);
      }

      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: formData.driver_id.trim(),
          full_name: formData.full_name.trim(),
          profile_image: uploadedUrl || formData.profile_image.trim() || null,
          cnic: formData.cnic.trim(),
          phone_number: formData.phone_number.trim(),
          emergency_contact: formData.emergency_contact.trim(),
          driving_license: formData.driving_license.trim(),
          license_expiry_date: formData.license_expiry_date,
          status: formData.status,
        }),
      });

      const text = await res.text();
      let data: DriverApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Non-JSON response:', text);
        setErrorMsg(`Server error (${res.status}). Check terminal.`);
        setIsSubmitting(false);
        setIsUploading(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create driver.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Driver registered successfully!');
      setIsSubmitting(false);

      setTimeout(() => {
        onSuccess();
      }, 900);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
      setIsSubmitting(false);
      setIsUploading(false);
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
              Register Driver
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill in the details below to add a new driver
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
          {/* ✅ Image Upload */}
          <div>
            <label className={labelClass}>Profile Image</label>

            {imagePreview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
                  aria-label="Remove image"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-black hover:bg-gray-100 transition-all"
              >
                <FiUploadCloud className="w-7 h-7 text-black" />
                <span className="text-sm text-black font-medium">
                  Click to upload image
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG, WEBP — max 5 MB
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Optional: paste URL manually */}
            <div className="mt-2">
              <input
                type="url"
                name="profile_image"
                value={formData.profile_image}
                onChange={handleChange}
                placeholder="Or paste image URL (optional)"
                className={`${inputClass} text-xs`}
                disabled={!!imageFile}
              />
            </div>
          </div>

          {/* Driver ID + Full Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>
                Driver ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="driver_id"
                value={formData.driver_id}
                onChange={handleChange}
                placeholder="e.g. DRV-001"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Muhammad Imran"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* CNIC + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>
                CNIC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                placeholder="e.g. 35202-1234567-1"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="e.g. 0300-1234567"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Emergency + License */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>
                Emergency Contact <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
                placeholder="e.g. 0321-7654321"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Driving License <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="driving_license"
                value={formData.driving_license}
                onChange={handleChange}
                placeholder="e.g. LHR-2020-12345"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Expiry + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className={labelClass}>
                License Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="license_expiry_date"
                value={formData.license_expiry_date}
                onChange={handleChange}
                required
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
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
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
              disabled={isSubmitting || isUploading}
              className={`px-6 py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                isSubmitting || isUploading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isUploading
                ? 'Uploading...'
                : isSubmitting
                ? 'Registering...'
                : 'REGISTER DRIVER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}