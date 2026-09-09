import React from 'react';

export const CardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col bg-[#13151f] border border-white/5 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[3/4.2] w-full bg-slate-800/60" />
      <div className="p-3.5 flex flex-col gap-2">
        <div className="h-4 bg-slate-700/60 rounded w-3/4" />
        <div className="h-3 bg-slate-800/80 rounded w-1/2" />
        <div className="flex gap-1.5 mt-1">
          <div className="h-3 bg-slate-800/60 rounded w-10" />
          <div className="h-3 bg-slate-800/60 rounded w-10" />
        </div>
      </div>
    </div>
  );
};

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="relative w-full h-[580px] sm:h-[640px] lg:h-[720px] bg-[#0d0f17] animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-transparent" />
      <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-end pb-16 px-4 sm:px-8">
        <div className="h-6 w-32 bg-slate-800 rounded-full mb-3" />
        <div className="h-10 sm:h-14 w-3/4 max-w-xl bg-slate-700 rounded-xl mb-4" />
        <div className="flex gap-2 mb-4">
          <div className="h-5 w-16 bg-slate-800 rounded-full" />
          <div className="h-5 w-16 bg-slate-800 rounded-full" />
        </div>
        <div className="h-16 w-full max-w-md bg-slate-800/70 rounded-lg mb-6" />
        <div className="flex gap-3">
          <div className="h-12 w-32 bg-rose-900/40 rounded-xl" />
          <div className="h-12 w-32 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
