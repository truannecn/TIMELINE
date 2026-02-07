'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function CreateDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-black/40 bg-[#e6e6e6] px-4 py-1.5 text-sm shadow-sm hover:bg-[#dcdcdc] transition-colors"
      >
        <span className="text-base">+</span>
        <span>create</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white border border-black/20 rounded-lg shadow-lg z-50 overflow-hidden min-w-[140px]">
          <Link
            href="/create-thread"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm border-b border-black/10 hover:bg-black/5 transition-colors"
          >
            <span>✱</span>
            <span>thread</span>
          </Link>
          <Link
            href="/upload"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 transition-colors"
          >
            <span>@</span>
            <span>post</span>
          </Link>
        </div>
      )}
    </div>
  );
}
