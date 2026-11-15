'use client';

import React from 'react';

export interface BouncyCloudsProps {
  isCritical: boolean;
}

export const BouncyClouds: React.FC<BouncyCloudsProps> = ({ isCritical }) => {
  return (
    <div className="relative w-full h-32 sm:h-36 overflow-hidden rounded-b-2xl border-t border-slate-800/60 select-none bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent">
      {/* Soft Ambient Sky Glow (Clean, neutral, zero neon/cyan glow) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 bg-gradient-to-t from-slate-900/50 to-transparent"
      />

      {/* Subtle Floating Sky Dust / Twinkles (Safely away from keyboard area) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
        <span className="absolute left-[45%] bottom-18 text-slate-300 text-xs anim-star-twinkle">✦</span>
        <span className="absolute right-[32%] bottom-22 text-slate-300 text-xs anim-star-twinkle-delay">★</span>
        <span className="absolute right-[16%] bottom-26 text-slate-200 text-xs anim-star-twinkle">✦</span>
        <span className="absolute right-[6%] bottom-16 text-amber-100 text-xs anim-star-twinkle-delay">✦</span>
      </div>

      {/* SVG Unified Puffy Cloud Bank (Smooth interconnected cumulus paths, NO random circles or ellipses) */}
      <svg
        className="absolute inset-0 w-full h-full anim-cloud-drift"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 140"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Back Cloud Gradient - Soft Atmospheric Depth */}
          <linearGradient id="cloudBackGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#334155" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
          </linearGradient>

          {/* Mid Cloud Gradient - Volumetric Body */}
          <linearGradient id="cloudMidGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#64748B" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.95" />
          </linearGradient>

          {/* Front Main Cloud Cushion Gradient - Luscious White & Pearl Pillowy Bed */}
          <linearGradient id="cloudFrontGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="25%" stopColor="#F1F5F9" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#CBD5E1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.98" />
          </linearGradient>

          {/* Cloud Base Shadow */}
          <linearGradient id="cloudBaseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* 1. LAYER 1: Deep Distant Cumulus Cloud Bank (Leaves left keyboard area completely clear) */}
        <path
          d="M 0 140 
             L 0 135 
             C 120 135, 240 130, 330 95 
             C 380 50, 440 40, 500 55 
             C 570 25, 660 20, 740 52 
             C 810 30, 880 35, 940 60 
             C 970 48, 990 52, 1000 70 
             L 1000 140 
             L 0 140 Z"
          fill="url(#cloudBackGradient)"
        />

        {/* 2. LAYER 2: Mid Ground Rolling Cloud Formation (Smooth slope rising toward center landing) */}
        <path
          d="M 0 140 
             L 0 137 
             C 120 137, 250 132, 340 100 
             C 380 50, 445 42, 510 68 
             C 570 36, 645 32, 715 62 
             C 765 48, 835 44, 895 72 
             C 940 58, 980 62, 1000 85 
             L 1000 140 
             L 0 140 Z"
          fill="url(#cloudMidGradient)"
        />

        {/* 3. LAYER 3: Foreground Main Marshmallow Cloud Pillow (Low on left, billows under stickman at x=500) */}
        <path
          d="M 0 140 
             L 0 138 
             C 140 138, 260 135, 350 108 
             C 385 64, 420 50, 470 66 
             C 495 30, 545 30, 570 66 
             C 615 46, 660 54, 710 78 
             C 770 56, 830 65, 875 88 
             C 925 68, 970 75, 1000 100 
             L 1000 140 
             L 0 140 Z"
          fill="url(#cloudFrontGradient)"
          stroke="#F8FAFC"
          strokeWidth="1.2"
        />

        {/* 4. LAYER 4: Soft Cloud Crest Highlights (Volumetric puffiness centered at x=500) */}
        <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
          {/* Main central landing bed highlight directly under stickman (centered on x=500) */}
          <path d="M 465 38 C 488 30, 512 30, 535 38" strokeWidth="3" opacity="0.8" />
          {/* Center and right billow highlights */}
          <path d="M 360 62 C 385 52, 415 52, 435 63" strokeWidth="2.5" opacity="0.65" />
          <path d="M 575 63 C 595 52, 625 52, 655 60" strokeWidth="2.5" opacity="0.65" />
          <path d="M 725 74 C 750 62, 790 62, 820 70" strokeWidth="2.5" opacity="0.6" />
        </g>

        {/* Bottom Grounding Shadow Strip */}
        <rect x="0" y="115" width="1000" height="25" fill="url(#cloudBaseGradient)" />
      </svg>

      {/* Cloud Pillow Label / Safety Zone Banner */}
      <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 text-xs font-pencil tracking-widest text-slate-200 select-none pointer-events-none drop-shadow-sm">
        <span>☁️</span>
        <span className="font-bold text-slate-100">
          CLOUD SAFETY HAVEN
        </span>
        <span>☁️</span>
      </div>
    </div>
  );
};

