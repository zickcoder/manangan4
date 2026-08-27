import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  Wrench, 
  BarChart3, 
  ChevronRight, 
  LogOut, 
  X,
  User,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function AppSidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const userStr = sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user');
  let user: any = { name: 'Atty. Elena Ramos', role: 'Super Admin', email: 'admin@govserve.gov.ph' };
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const isCitizen = user?.role === 'Citizen';

  const handleLogout = () => {
    sessionStorage.removeItem('govserve_user');
    localStorage.removeItem('govserve_user');
    navigate(isCitizen ? '/login' : '/admin/login');
  };

  const navGroups = isCitizen
    ? [
        {
          label: 'OVERVIEW',
          items: [
            { name: 'Citizen Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'My Tickets & Applications', path: '/my-tickets', icon: FileText },
          ]
        },
        {
          label: 'E-SERVICES',
          items: [
            { name: 'Facility & Park Booking', path: '/facilities', icon: Building },
            { name: 'Water & Drainage Desk', path: '/utilities', icon: Droplet },
            { name: 'Burial & Cemetery Permit', path: '/cemetery', icon: Cross },
            { name: 'Public Asset Catalog', path: '/assets', icon: Wrench },
          ]
        }
      ]
    : [
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
        }
      ];

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <aside
      className={clsx(
        "gradient-sidebar text-slate-100 flex flex-col justify-between border-r border-[#1e293b] select-none",
        "fixed inset-y-0 left-0 z-40 w-64 md:static md:translate-x-0 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="p-4 flex items-center justify-between border-b border-[#1e293b]/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center shrink-0 relative bg-white/10 rounded-xl p-1">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain drop-shadow-sm"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-widest font-display text-white uppercase">GOVSERVE</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/40 text-blue-200 font-bold rounded border border-blue-400/30 uppercase tracking-wider">
                  {isCitizen ? 'CITIZEN' : 'LGU'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Public Assets & Facilities Portal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative",
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={clsx("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400")} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-[#1e293b]/70 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
              {getInitials(user?.name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <span className="text-[10px] text-blue-300 font-medium">
                {isCitizen ? 'Registered Citizen' : user?.role || 'Staff'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
