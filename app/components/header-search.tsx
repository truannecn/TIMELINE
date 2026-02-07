"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  // Sync with URL params only on explore page
  useEffect(() => {
    if (pathname === "/explore") {
      setQuery(searchParams.get("q") || "");
    } else {
      setQuery("");
    }
  }, [searchParams, pathname]);

  // Hide search bar on profile edit and upload pages
  if (pathname === "/profile/edit" || pathname === "/upload") {
    return null;
  }

  const handleSearch = (value: string) => {
    setQuery(value);

    if (value.trim()) {
      router.push(`/explore?q=${encodeURIComponent(value)}`);
    } else {
      router.push('/explore');
    }
  };

  const handleClear = () => {
    setQuery("");
    router.push('/explore');
  };

  return (
    <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm">
      <input
        type="text"
        placeholder="search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-48 bg-transparent text-sm outline-none placeholder:text-black/40"
      />
      {query ? (
        <button
          onClick={handleClear}
          className="text-black/40 hover:text-black/60 transition-colors"
        >
          ×
        </button>
      ) : (
        <span className="text-black/60">⌕</span>
      )}
    </div>
  );
}
