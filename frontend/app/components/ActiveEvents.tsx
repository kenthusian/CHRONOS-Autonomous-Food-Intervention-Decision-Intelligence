'use client';

import React from 'react';
import { ActiveEvent } from '@/app/types';
import { AlertTriangle, TrendingUp, Truck, AlertCircle } from 'lucide-react';

interface ActiveEventsProps {
  events: ActiveEvent[];
}

const getEventIcon = (type: 'temperature' | 'demand' | 'logistics' | 'other') => {
  switch (type) {
    case 'temperature':
      return AlertTriangle;
    case 'demand':
      return TrendingUp;
    case 'logistics':
      return Truck;
    default:
      return AlertCircle;
  }
};

const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
  switch (severity) {
    case 'low':
      return 'bg-blue-900 text-blue-300 border-blue-700';
    case 'medium':
      return 'bg-yellow-900 text-yellow-300 border-yellow-700';
    case 'high':
      return 'bg-red-900 text-red-300 border-red-700';
  }
};

export default function ActiveEvents({ events }: ActiveEventsProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Active Events</h2>

      <div className="space-y-3">
        {events.map((event) => {
          const EventIcon = getEventIcon(event.type);
          return (
            <div
              key={event.id}
              className={`p-4 rounded-lg border ${getSeverityColor(event.severity)} bg-opacity-10`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <EventIcon size={18} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white text-sm">{event.title}</h3>
                    <p className="text-xs text-slate-300 mt-1">{event.description}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider whitespace-nowrap ml-2 border ${getSeverityColor(event.severity)}`}
                >
                  {event.severity}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pl-6">
                <span>{event.timestamp}</span>
                <span>{event.affectedBatches} batch(es) affected</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
