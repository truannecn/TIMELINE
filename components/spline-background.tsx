'use client';

import Spline from '@splinetool/react-spline/next';
import type { Application } from '@splinetool/runtime';

export function SplineBackground(): JSX.Element {
  function handleLoad(splineApp: Application): void {
    // Ensure animations play continuously
    splineApp.play();
  }

  return (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
      <Spline
        scene="https://prod.spline.design/pyjywHPtPAQK4IZm/scene.splinecode"
        onLoad={handleLoad}
        style={{
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          filter: 'grayscale(80%)',
          transform: 'translateX(-5%)',
        }}
      />
    </div>
  );
}
