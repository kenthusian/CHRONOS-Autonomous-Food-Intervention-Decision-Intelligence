'use client';

import React from 'react';
import { Home, Package, AlertTriangle, Zap, Settings } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      active: true,
    },
    {
      icon: Package,
      label: 'Inventory',
      active: false,
    },
    {
      icon: AlertTriangle,
      label: 'Alerts',
      active: false,
    },
    {
      icon: Zap,
      label: 'Decisions',
      active: false,
    },
    {
      icon: Settings,
      label: 'Settings',
      active: false,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-700">
        <div className="text-xl font-bold text-white">
          CHR<span className="text-blue-400">ON</span>OS
        </div>
        <p className="text-xs text-slate-400 mt-1">Food Intelligence</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                item.active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-300 mb-2">Agent Status</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full" />
            <span className="text-xs text-slate-400">AI Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
