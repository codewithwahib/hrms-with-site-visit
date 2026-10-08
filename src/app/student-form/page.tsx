'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DM_Sans } from 'next/font/google';
// import Navbar from '../Components/navbar';
// import Footer from '../Components/footer';

const dmsans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

type StudentApiResponse = {
  error?: string;
  message?: string;
  student?: {
    id?: string;
    student_id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
};

export default function CreateStudentPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    father_name: '',
    department: '',
    semester: '',
    phone_number: '',
    emergency_contact: '',
    home_address: '',
    pickup_point: '',
    drop_point: '',
    cnic: '',
    status: 'active',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          student_id: formData.student_id.trim(),
          full_name: formData.full_name.trim(),
          father_name: formData.father_name.trim(),
          department: formData.department.trim(),
          semester: Number(formData.semester),
          phone_number: formData.phone_number.trim(),
          emergency_contact: formData.emergency_contact.trim(),
          home_address: formData.home_address.trim(),
          pickup_point: formData.pickup_point.trim(),
          drop_point: formData.drop_point.trim(),
          cnic: formData.cnic.trim() || null,
        }),
      });

      const text = await res.text();
      let data: StudentApiResponse = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Non-JSON response:', text);
        setErrorMsg('Server error. Please check terminal.');
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create student.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Student registered successfully!');
      setIsSubmitting(false);

      setFormData({
        student_id: '',
        full_name: '',
        father_name: '',
        department: '',
        semester: '',
        phone_number: '',
        emergency_contact: '',
        home_address: '',
        pickup_point: '',
        drop_point: '',
        cnic: '',
        status: 'active',
      });

      setTimeout(() => {
        router.push('/students');
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base text-black border border-gray-300 rounded-sm focus:border-[#009E4D] focus:ring-1 focus:ring-[#009E4D] outline-none transition bg-white placeholder:text-gray-500';

  const labelClass = 'block text-xs sm:text-sm font-medium text-gray-700 mb-1.5';

  return (
    <>
      {/* <Navbar /> */}

      <div
        className={`bg-white flex items-center justify-center px-4 sm:px-6 md:px-8 min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-200px)] py-10 sm:py-16 md:py-24 ${dmsans.className}`}
      >
        <div className="w-full max-w-2xl">
          {/* Heading */}
          <h1 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold text-black tracking-tight mb-3">
            Register Student
          </h1>
          <p className="text-center text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 md:mb-10">
            Fill in the details below to add a new student
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Student ID + Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelClass}>
                  Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="e.g. FA21-BCS-001"
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
                  placeholder="e.g. Ali Ahmed"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Father Name + CNIC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelClass}>
                  Father Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  placeholder="e.g. Muhammad Ahmed"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>CNIC</label>
                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleChange}
                  placeholder="e.g. 35202-1234567-1"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Department + Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelClass}>
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Semester <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  min={1}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Phone + Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
            </div>

            {/* Home Address */}
            <div>
              <label className={labelClass}>
                Home Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="home_address"
                value={formData.home_address}
                onChange={handleChange}
                placeholder="e.g. House 123, Street 4, Lahore"
                required
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Pickup + Drop Point */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelClass}>
                  Pickup Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="pickup_point"
                  value={formData.pickup_point}
                  onChange={handleChange}
                  placeholder="e.g. Main Gate"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Drop Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="drop_point"
                  value={formData.drop_point}
                  onChange={handleChange}
                  placeholder="e.g. Campus Block A"
                  required
                  className={inputClass}
                />
              </div>
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

            {/* Error message */}
            {errorMsg && (
              <p className="text-center text-xs sm:text-sm text-red-600 -mt-1">
                {errorMsg}
              </p>
            )}

            {/* Success message */}
            {successMsg && (
              <p className="text-center text-xs sm:text-sm text-[#009E4D] font-semibold -mt-1">
                {successMsg}
              </p>
            )}

            {/* Submit Button */}
            <div className="pt-3 sm:pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold text-white uppercase tracking-wider transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#009E4D] hover:bg-black'
                }`}
              >
                {isSubmitting ? 'Registering...' : 'REGISTER STUDENT'}
              </button>
            </div>

            {/* Back link */}
            <p className="text-center text-xs sm:text-sm text-gray-600 pt-3">
              Already have students?{' '}
              <Link
                href="/students"
                className="text-[#009E4D] hover:text-black font-semibold transition-colors"
              >
                View all students
              </Link>
            </p>
          </form>
        </div>
      </div>
      {/* <Footer /> */}
    </>
  );
}