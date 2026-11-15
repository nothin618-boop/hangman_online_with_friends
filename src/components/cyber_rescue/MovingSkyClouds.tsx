'use client';

import React, { memo } from 'react';

export const MovingSkyClouds: React.FC = memo(() => {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
      data-testid="moving-sky-clouds"
    >
      {/* ============================================================== */}
      {/* CLOUD 1: High Sky Wispy Cumulus (Slow & Distant)              */}
      {/* ============================================================== */}
      <div
        className="absolute left-0 anim-sky-cloud-slow"
        style={{
          top: '9%',
          animationDelay: '-16s',
          animationDuration: '46s',
        }}
      >
        <svg
          width="180"
          height="55"
          viewBox="0 0 180 55"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-40"
        >
          <defs>
            <linearGradient id="skyCloudG1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#94A3B8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M 22 45 
               C 12 45, 4 37, 10 27 
               C 14 20, 24 19, 30 21 
               C 36 11, 52 4, 68 8 
               C 80 1, 98 3, 108 13 
               C 118 8, 134 11, 142 20 
               C 152 21, 162 28, 158 38 
               C 154 44, 145 45, 140 45 
               Z"
            fill="url(#skyCloudG1)"
          />
          <path
            d="M 34 20 C 44 11, 58 6, 68 9"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.45"
          />
          <path
            d="M 80 4 C 92 3, 102 6, 108 13"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* ============================================================== */}
      {/* CLOUD 2: Upper-Mid Sky Fluffy Cumulus (Behind Parachute Canopy) */}
      {/* ============================================================== */}
      <div
        className="absolute left-0 anim-sky-cloud-mid"
        style={{
          top: '22%',
          animationDelay: '-5s',
          animationDuration: '32s',
        }}
      >
        <svg
          width="240"
          height="72"
          viewBox="0 0 240 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-55 drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        >
          <defs>
            <linearGradient id="skyCloudG2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#CBD5E1" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 28 60 
               C 14 60, 6 48, 14 36 
               C 20 28, 32 26, 40 29 
               C 48 16, 66 8, 88 12 
               C 102 3, 126 5, 140 17 
               C 152 11, 172 15, 182 27 
               C 196 28, 208 38, 204 50 
               C 200 58, 188 60, 180 60 
               Z"
            fill="url(#skyCloudG2)"
          />
          <path
            d="M 44 26 C 55 14, 72 9, 88 13"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M 104 5 C 118 4, 132 8, 140 17"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M 154 13 C 166 12, 176 16, 182 24"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* ============================================================== */}
      {/* CLOUD 3: Upper Sky Cloud (Safely in upper sky, never behind keyboard) */}
      {/* ============================================================== */}
      <div
        className="absolute left-0 anim-sky-cloud-slow"
        style={{
          top: '14%',
          animationDelay: '-24s',
          animationDuration: '40s',
        }}
      >
        <svg
          width="270"
          height="80"
          viewBox="0 0 270 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-50 drop-shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
        >
          <defs>
            <linearGradient id="skyCloudG3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#E2E8F0" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <path
            d="M 32 68 
               C 16 68, 8 55, 17 42 
               C 23 32, 38 31, 48 34 
               C 56 20, 78 10, 102 15 
               C 118 5, 146 7, 162 20 
               C 176 13, 200 17, 212 30 
               C 228 32, 242 43, 237 57 
               C 232 66, 218 68, 208 68 
               Z"
            fill="url(#skyCloudG3)"
          />
          <path
            d="M 52 30 C 66 18, 85 12, 102 16"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 120 7 C 138 6, 154 10, 162 20"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* ============================================================== */}
      {/* CLOUD 4: Upper-Mid Sky Cloud (Safely in upper sky, never behind keyboard) */}
      {/* ============================================================== */}
      <div
        className="absolute left-0 anim-sky-cloud-fast"
        style={{
          top: '20%',
          animationDelay: '-12s',
          animationDuration: '28s',
        }}
      >
        <svg
          width="210"
          height="62"
          viewBox="0 0 210 62"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-45"
        >
          <defs>
            <linearGradient id="skyCloudG4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#94A3B8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1E293B" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <path
            d="M 24 50 
               C 12 50, 5 40, 12 30 
               C 17 23, 28 22, 35 24 
               C 42 12, 58 6, 75 9 
               C 88 2, 108 4, 120 14 
               C 130 9, 146 12, 154 21 
               C 165 22, 175 30, 171 40 
               C 167 48, 157 50, 150 50 
               Z"
            fill="url(#skyCloudG4)"
          />
          <path
            d="M 40 22 C 49 13, 64 8, 75 11"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M 90 4 C 102 3, 114 6, 120 14"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* ============================================================== */}
      {/* CLOUD 5: High Right Wispy Drift (Atmospheric Parallax Accent) */}
      {/* ============================================================== */}
      <div
        className="absolute left-0 anim-sky-cloud-slow"
        style={{
          top: '16%',
          animationDelay: '-32s',
          animationDuration: '52s',
        }}
      >
        <svg
          width="160"
          height="48"
          viewBox="0 0 160 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-35"
        >
          <defs>
            <linearGradient id="skyCloudG5" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#64748B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M 20 40 
               C 10 40, 4 32, 10 24 
               C 14 18, 22 17, 28 19 
               C 34 10, 48 5, 62 8 
               C 72 3, 88 5, 96 13 
               C 105 9, 118 12, 124 19 
               C 132 20, 140 26, 137 34 
               C 134 40, 126 40, 120 40 
               Z"
            fill="url(#skyCloudG5)"
          />
        </svg>
      </div>
    </div>
  );
});

MovingSkyClouds.displayName = 'MovingSkyClouds';

