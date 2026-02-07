"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Spline from "@splinetool/react-spline";
import type { Application } from "@splinetool/runtime";

interface Work {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  work_type: "image" | "essay";
}

interface SpiralTimelineProps {
  works: Work[];
}

export default function SpiralTimeline({ works }: SpiralTimelineProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<Application | null>(null);

  // Handle scroll animation
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate scroll progress (0 to 1)
      const progress = Math.max(
        0,
        Math.min(1, (windowHeight - rect.top) / (windowHeight + rect.height))
      );

      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial call

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Spiral positions for works (adjusted based on scroll)
  const getSpiralPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 6; // 3 full rotations for more spiral
    const radius = 150 + (index / total) * 120; // Expanding radius
    const x = Math.cos(angle) * radius;
    const y = index * 200; // More vertical spacing

    return { x, y, angle };
  };

  const onSplineLoad = (spline: Application) => {
    splineRef.current = spline;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#f6f5f5] rounded-[39px] p-8 overflow-hidden"
    >
      {/* Spline 3D Spiral */}
      <div
        className="absolute left-1/2 w-[800px] pointer-events-none overflow-hidden"
        style={{
          top: "200px", // Start lower
          height: `${works.length * 200 + 800}px`, // Height scales with number of works
          transform: `translateX(-60%) translateY(${-scrollProgress * (works.length * 50)}px)`, // More centered and continuous scroll
          transition: "transform 0.1s ease-out",
        }}
      >
        {/* Inner container for zoom/crop */}
        <div
          className="w-full h-full"
          style={{
            transform: "scale(1.5) translateY(-15%)",
            transformOrigin: "center center",
          }}
        >
          <Spline
            scene="/scene.splinecode"
            onLoad={onSplineLoad}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Timeline content */}
      <div className="relative z-10">
        {works.map((work, index) => {
          const position = getSpiralPosition(index, works.length);
          const isLeft = index % 2 === 0;

          return (
            <div
              key={work.id}
              className="absolute flex items-center gap-4"
              style={{
                top: `${position.y + 300}px`, // Offset to align with spiral starting lower
                left: isLeft ? "15%" : "auto",
                right: isLeft ? "auto" : "15%",
                opacity: Math.max(0, 1 - Math.abs(position.y - scrollProgress * 1000) / 500),
                transform: `scale(${Math.max(0.8, 1 - Math.abs(position.y - scrollProgress * 1000) / 1000)})`,
                transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
              }}
            >
              {/* Arrow pointing to spiral */}
              <div
                className={`w-20 h-[2px] bg-black/30 relative ${isLeft ? "order-2" : "order-1"}`}
                style={{
                  transform: `rotate(${isLeft ? position.angle * (180 / Math.PI) : position.angle * (180 / Math.PI) + 180}deg)`,
                }}
              >
                <div
                  className={`absolute ${isLeft ? "right-0" : "left-0"} top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-500`}
                />
              </div>

              {/* Work card */}
              <Link
                href={`/work/${work.id}`}
                className={`${isLeft ? "order-1" : "order-2"} block w-40 h-40 bg-[#d9d9d9] rounded-lg overflow-hidden border border-black/10 hover:scale-105 transition-transform shadow-lg`}
              >
                {work.image_url && (
                  <img
                    src={work.image_url}
                    alt={work.title}
                    className="w-full h-full object-cover"
                  />
                )}
                {work.work_type === "essay" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <span className="text-xs font-medium px-2 py-1 bg-white/90 rounded">
                      Essay
                    </span>
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Padding at bottom for scroll */}
      <div style={{ height: `${works.length * 200 + 800}px` }} />
    </div>
  );
}
