import Link from "next/link";
import { Star } from "lucide-react";
import { DraggableTagline } from "@/components/draggable-tagline";
import { SplineBackground } from "@/components/spline-background";

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Spline 3D background */}
      <SplineBackground />

      {/* Left section — logo + tagline */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 relative z-10">
        <h1 className="font-[family-name:var(--font-jetbrains-mono)] text-[#484545] text-5xl sm:text-7xl lg:text-[128px] leading-none">
          *-timeline
        </h1>

        <DraggableTagline />
      </div>

      {/* Right panel — CTA + buttons */}
      <div className="w-full lg:w-[30%] bg-[rgba(107,100,134,0.5)] flex flex-col items-center justify-center gap-8 p-8 sm:p-12 relative z-10">
        <p className="font-[family-name:var(--font-serif-display)] text-white text-2xl sm:text-[32px] leading-tight text-center max-w-[293px]">
          join millions of other creatives
        </p>

        <div className="flex flex-col gap-4 w-full max-w-[230px]">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-[#2c2c2c] border border-[#2c2c2c] text-[#f5f5f5] rounded-lg px-3 py-3 text-base hover:bg-[#3a3a3a] transition-colors"
          >
            <Star className="w-4 h-4" />
            sign up
          </Link>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-[#2c2c2c] border border-[#2c2c2c] text-[#f5f5f5] rounded-lg px-3 py-3 text-base hover:bg-[#3a3a3a] transition-colors"
          >
            <Star className="w-4 h-4" />
            log in
          </Link>
        </div>
      </div>\
    </div>
  );
}
