// src/components/LoadingAnimation.tsx
"use client";

import { useEffect, useState } from "react";

export function LoadingAnimation() {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-[999] flex items-center justify-center">
      <style>{`
        @keyframes engineRumble {
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(-2px) translateY(-1px); }
          50% { transform: translateX(2px) translateY(1px); }
          75% { transform: translateX(-1px) translateY(-2px); }
        }
        
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes gearRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        
        @keyframes glideIn {
          from { 
            opacity: 0;
            transform: translateX(-30px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes glow {
          0%, 100% { 
            filter: drop-shadow(0 0 2px rgba(212, 175, 55, 0.3));
          }
          50% { 
            filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.6));
          }
        }
        
        .loading-car {
          animation: engineRumble 0.4s ease-in-out infinite, glideIn 0.8s ease-out;
        }
        
        .loading-wheel {
          animation: wheelSpin 1s linear infinite;
          transform-origin: center;
        }
        
        .loading-gear {
          animation: gearRotate 2s linear infinite;
          transform-origin: center;
        }
        
        .loading-text {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className="flex flex-col items-center gap-6">
        {/* Animated Car Logo Area */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Background gear (large, behind) */}
          <svg
            className="loading-gear absolute w-28 h-28 text-yellow-500 opacity-10"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="50" cy="50" r="40" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const x = 50 + 40 * Math.cos((angle * Math.PI) / 180);
              const y = 50 + 40 * Math.sin((angle * Math.PI) / 180);
              return (
                <rect
                  key={angle}
                  x={x - 3}
                  y={y - 6}
                  width="6"
                  height="12"
                  transform={`rotate(${angle} ${x} ${y})`}
                />
              );
            })}
          </svg>

          {/* Main logo container */}
          <div className="loading-car relative z-10">
            {/* Simplified car icon */}
            <svg
              className="w-20 h-20 text-yellow-500"
              viewBox="0 0 100 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Car body */}
              <path d="M 20 35 L 25 20 L 75 20 L 80 35 Z" />
              {/* Car roof */}
              <path d="M 35 20 L 40 10 L 60 10 L 65 20" />
              {/* Left wheel (animated) */}
              <g className="loading-wheel">
                <circle cx="30" cy="42" r="8" />
                <line x1="30" y1="34" x2="30" y2="50" strokeWidth="1.5" />
              </g>
              {/* Right wheel (animated) */}
              <g className="loading-wheel">
                <circle cx="70" cy="42" r="8" />
                <line x1="70" y1="34" x2="70" y2="50" strokeWidth="1.5" />
              </g>
              {/* Window */}
              <path d="M 40 22 L 55 22 L 52 28 L 40 28 Z" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Foreground gear (small, in front) */}
          <svg
            className="loading-gear absolute w-12 h-12 text-yellow-500 opacity-20 bottom-0 right-0"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <circle cx="50" cy="50" r="30" />
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const x = 50 + 30 * Math.cos((angle * Math.PI) / 180);
              const y = 50 + 30 * Math.sin((angle * Math.PI) / 180);
              return (
                <rect
                  key={angle}
                  x={x - 2}
                  y={y - 5}
                  width="4"
                  height="10"
                  transform={`rotate(${angle} ${x} ${y})`}
                />
              );
            })}
          </svg>
        </div>

        {/* Text with loading animation */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-yellow-500 loading-text tracking-tight">
            Motorsource
          </h1>
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-1 justify-center">
            Loading
            <span className="inline-block w-1">
              {dots === 0 && "."}
              {dots === 1 && ".."}
              {dots === 2 && "..."}
              {dots === 3 && ""}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
