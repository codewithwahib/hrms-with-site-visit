'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DM_Sans } from 'next/font/google';
import {
  FiMenu,
  FiX,
  FiHome,
  FiUsers,
  FiTruck,
  FiMapPin,
  FiDollarSign,
  FiLogOut,
  FiUser,
  FiChevronDown,
} from 'react-icons/fi';

const dmsans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

type User = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: unknown;
};

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/admin/students', label: 'Students', icon: FiUsers },
  { href: '/admin/drivers', label: 'Drivers', icon: FiUser },
  { href: '/admin/routes', label: 'Routes', icon: FiMapPin },
  { href: '/admin/vans', label: 'Vans', icon: FiTruck },
  { href: '/admin/fees', label: 'Fees', icon: FiDollarSign },
];

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // ✅ Load user from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // ✅ Close user menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ✅ Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/');

  const displayName =
    user?.first_name || user?.last_name
      ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
      : user?.email ?? 'Admin';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className={`sticky top-0 z-40 bg-white border-b border-gray-200 ${dmsans.className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ---------- Logo ---------- */}
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
              MN
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-bold text-black">
                M. Nazir Enterprises
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Transport Services
              </span>
            </div>
          </Link>

          {/* ---------- Desktop Nav ---------- */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                    active
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ---------- Right side: user menu + mobile toggle ---------- */}
          <div className="flex items-center gap-2">
            {/* User menu (desktop) */}
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 text-black flex items-center justify-center font-bold text-xs border border-gray-200">
                  {initials}
                </div>
                <span className="text-sm font-medium text-black max-w-[120px] truncate">
                  {displayName}
                </span>
                <FiChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-black truncate">
                      {displayName}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/admin/profile"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FiUser className="w-4 h-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-sm text-black hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? (
                <FiX className="w-5 h-5" />
              ) : (
                <FiMenu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Mobile menu ---------- */}
      {isMobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                    active
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile user section */}
            <div className="pt-3 mt-3 border-t border-gray-100">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-gray-100 text-black flex items-center justify-center font-bold text-xs border border-gray-200">
                  {initials}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-black truncate">
                    {displayName}
                  </span>
                  {user?.email && (
                    <span className="text-xs text-gray-500 truncate">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/admin/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-gray-700 hover:bg-gray-100"
              >
                <FiUser className="w-4 h-4" />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-red-600 hover:bg-red-50"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}