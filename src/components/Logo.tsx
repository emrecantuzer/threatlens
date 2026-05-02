import React from 'react';

export default function Logo() {
  return (
    <div className="h-[60px] flex flex-col justify-center px-4">
      <div className="flex items-center">
        <img src="/logo/threatlens-logo.png" alt="ThreatLens" className="h-8 w-auto mr-2" />
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 text-transparent bg-clip-text">
          ThreatLens
        </h1>
      </div>
    </div>
  );
}