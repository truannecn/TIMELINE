'use client';

import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';

export function SplineBackground(): JSX.Element {
  function handleLoad(splineApp: Application): void {
    // Re-trigger all animations so they loop continuously
    splineApp.stop();
    splineApp.play();
  }

  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden">
      <Spline
        scene="/scene.splinecode"
        onLoad={handleLoad}
        style={{
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          transform: 'translateX(-25%)',
        }}
      />
    </div>
  );
}
