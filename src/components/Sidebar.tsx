import React, { useState } from 'react';
import { 
  BarChart3,
  ScrollText,
  Bell,
  Shield,
  Users,
  Settings,
  Menu,
  AlertTriangle,
  LineChart,
  Globe
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

const menuItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/' },
  { icon: LineChart, label: 'Advanced Analytics', path: '/analytics' },
  { icon: Globe, label: 'Cyber Map', path: '/cyber-map' },
  { icon: ScrollText, label: 'Log Management', path: '/logs' },
  { icon: AlertTriangle, label: 'Event Management', path: '/events' },
  { icon: Shield, label: 'Rules Management', path: '/rules' },
  { icon: Users, label: 'User Management', path: '/users' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div 
      className={`bg-[#0f172a] text-white h-screen transition-all duration-300 flex flex-col border-r border-gray-800 shadow-2xl relative ${
        collapsed ? 'w-20' : 'w-[260px]'
      }`}
    >
      <div className="flex-shrink-0 h-20 flex items-center justify-center border-b border-gray-800/50">
        {collapsed ? (
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <img src="/logo/threatlens-logo.png" alt="TL" className="h-6 w-6 object-contain" />
          </div>
        ) : (
          <div className="scale-90 origin-center">
            <Logo />
          </div>
        )}
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-9 bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-500 transition-colors border-2 border-[#0f172a] z-50 flex items-center justify-center"
      >
        <Menu size={14} />
      </button>
      
      <nav className="mt-6 flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon size={22} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors relative z-10`} />
              {!collapsed && (
                <span className="ml-3 font-medium tracking-wide text-sm relative z-10">{item.label}</span>
              )}
              {isActive && (
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 m-4 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-xs font-bold shadow-lg text-white">
              TL
            </div>
            <div>
              <p className="text-xs font-bold text-white">ThreatLens Pro</p>
              <p className="text-[10px] text-slate-400">v1.2.0 (Stable)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}