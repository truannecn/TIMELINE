"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavButtons() {
  const pathname = usePathname();

  return (
    <div className="flex items-center rounded-full bg-white border border-black/20 px-2 py-1 shadow-sm">
      <Link
        href="/explore"
        className={`rounded-full px-5 py-1 text-sm transition-colors ${
          pathname === "/explore"
            ? "bg-[#EEE5EE]"
            : "hover:bg-black/5"
        }`}
      >
        explore
      </Link>
      <Link
        href="/expand"
        className={`rounded-full px-5 py-1 text-sm transition-colors ${
          pathname === "/expand"
            ? "bg-[#EEE5EE]"
            : "text-black/60 hover:bg-black/5"
        }`}
      >
        expand
      </Link>
    </div>
  );
}
