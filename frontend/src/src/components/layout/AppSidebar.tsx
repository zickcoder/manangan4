import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LayoutDashboard, 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  Wrench, 
  BarChart3, 
  ChevronRight, 
  LogOut, 
  ExternalLink 
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isCollapsed }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('govserve_user');
    navigate('/login');
  };

  const navGroups = [
    {
      label: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'FACILITIES & SPACES',
      items: [
        { name: 'Facility Reservation', path: '/facilities', icon: Building },
        { name: 'Parks & Recreation', path: '/parks', icon: Trees },
        { name: 'Cemetery & Burial', path: '/cemetery', icon: Cross },
      ]
    },
    {
      label: 'UTILITIES & ASSETS',
      items: [
        { name: 'Water & Drainage Desk', path: '/utilities', icon: Droplet },
        { name: 'Asset Inventory', path: '/assets', icon: Wrench },
      ]
    },
    {
      label: 'INTELLIGENCE & REPORTS',
      items: [
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ]
    }
  ];

  return (
    <aside
      className={clsx(
        "gradient-sidebar text-slate-100 flex flex-col justify-between border-r border-[#1e293b] transition-all duration-300 z-30 select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="p-4 flex items-center gap-3 border-b border-[#1e293b]/70">
          <div className="h-11 w-11 flex items-center justify-center shrink-0 relative">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain drop-shadow-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-widest font-display text-white uppercase">GOVSERVE</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/40 text-blue-200 font-bold rounded border border-blue-400/30 uppercase tracking-wider">LGU</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Public Assets & Facilities Mgmt.</p>
            </div>
          )}
        </div>



        {/* Navigation Menu */}
        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-190px)]">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      )
                    }
                    title={isCollapsed ? item.name : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={clsx("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400")} />
                        {!isCollapsed && (
                          <span className="flex-1 truncate">{item.name}</span>
                        )}
                        {!isCollapsed && isActive && (
                          <ChevronRight className="w-4 h-4 opacity-80" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Quick link to Public Portal */}
          <div className="pt-2">
            <a
              href="/portal"
              target="_blank"
              rel="noreferrer"
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/50 transition-colors",
                isCollapsed && "justify-center"
              )}
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Public Citizen Portal</span>}
            </a>
          </div>
        </div>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-[#1e293b]/70 bg-slate-950/40">
        <div className={clsx("flex items-center gap-3", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
              ER
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">Atty. Elena Ramos</p>
                <span className="text-[10px] text-blue-300 font-medium">Administrator</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
