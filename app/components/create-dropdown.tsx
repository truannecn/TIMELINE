'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  function handlePostClick() {
    setIsOpen(false);
    setShowPostModal(true);
  }

  function handleModalChoice(type: 'image' | 'essay') {
    setShowPostModal(false);
    router.push(`/upload?type=${type}`);
  }

  return (
    <>
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
            <button
              onClick={handlePostClick}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 transition-colors"
            >
              <span>@</span>
              <span>post</span>
            </button>
          </div>
        )}
      </div>

      {/* Post type modal */}
      {showPostModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowPostModal(false)}
        >
          {/* Faded background overlay */}
          <div className="absolute inset-0 bg-[#484545]/50" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-xl p-10 min-w-[360px] font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl text-center mb-2">create a post</h2>
            <p className="text-sm text-black/50 text-center mb-8">
              what would you like to share?
            </p>

            <div className="flex gap-6 justify-center">
              <button
                onClick={() => handleModalChoice('image')}
                className="flex flex-col items-center gap-3 rounded-xl border border-black/20 px-8 py-6 hover:bg-black/5 active:bg-black/10 transition-colors"
              >
                <span className="text-4xl">🖼</span>
                <span className="text-sm">photos</span>
              </button>

              <button
                onClick={() => handleModalChoice('essay')}
                className="flex flex-col items-center gap-3 rounded-xl border border-black/20 px-8 py-6 hover:bg-black/5 active:bg-black/10 transition-colors"
              >
                <span className="text-4xl">✍</span>
                <span className="text-sm">writing</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
