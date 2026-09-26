'use client';

import React, { useEffect } from 'react';
import { ZONES, Zone } from '@/lib/zones';

// Driver explicitly declares zone for MVP; real GPS integration is out of scope.
const STORAGE_KEY = 'tinchaka.driver.zone';

interface ZonePickerProps {
  currentZone: Zone;
  onZoneChange: (zone: Zone) => void;
}

export function ZonePicker({ currentZone, onZoneChange }: ZonePickerProps) {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ZONES.includes(stored as Zone)) {
        onZoneChange(stored as Zone);
      }
    } catch {
      // Fallback to default
    }
  }, [onZoneChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextZone = e.target.value as Zone;
    onZoneChange(nextZone);
    try {
      localStorage.setItem(STORAGE_KEY, nextZone);
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="driver_zone" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
        Current Zone:
      </label>
      <select
        id="driver_zone"
        value={currentZone}
        onChange={handleChange}
        className="px-3 py-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
      >
        {ZONES.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
    </div>
  );
}
