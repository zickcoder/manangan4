import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  Wrench, 
  BarChart3, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Search,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PublicNavbar } from '../components/layout/PublicNavbar';

export function LandingPage() {
  const phrases = [
    'Facility Reservations',
    'Parks & Recreation',
    'Cemetery & Burial Records',
    'Water & Drainage Services',
    'Asset Inventory Management'
  ];
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = phrases[currentPhraseIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        if (displayText === fullText) {
          setTimeout(() => setIsDeleting(true), 1600);
        }
      } else {
        setDisplayText(fullText.substring(0, displayText.length - 1));
        if (displayText === '') {
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentPhraseIndex]);

  const capabilities = [
    {
      title: 'Facility Reservation',
      icon: Building,
      color: 'from-blue-600 to-indigo-600',
      description: 'Online booking, availability checking, and permits for Civic Centers, Gymnasiums, and Multipurpose Halls.',
      link: '/portal?tab=facility'
    },
    {
      title: 'Parks & Recreation Scheduling',
      icon: Trees,
      color: 'from-emerald-500 to-teal-600',
      description: 'Reserve community parks, plazas, open-air amphitheaters, and sports grounds with smart conflict prevention.',
      link: '/portal?tab=park'
    },
    {
      title: 'Cemetery & Burial Management',
      icon: Cross,
      color: 'from-purple-500 to-violet-600',
      description: 'Digital plot mapping (Block/Lot/Niche), burial permit applications, deceased registry, and interment scheduling.',
      link: '/portal?tab=cemetery'
    },
    {
      title: 'Water Supply & Drainage Requests',
      icon: Droplet,
      color: 'from-cyan-500 to-blue-600',
      description: 'Citizen incident reporting for mainline pipe leaks, drainage declogging, sewer overflow, and crew dispatch tracking.',
      link: '/portal?tab=utility'
    },
    {
      title: 'Asset Inventory Management',
      icon: Wrench,
      color: 'from-amber-500 to-orange-600',
      description: 'Lifecycle monitoring for heavy backhoes, rescue tankers, water pumps, generators, and facility gear.',
      link: '/dashboard'
    },
    {
      title: 'AI Decision Support',
      icon: Bot,
      color: 'from-rose-500 to-pink-600',
      description: 'Smart reservation recommendation, automated urgency triage, schedule conflict checks, and predictive maintenance alerts.',
      link: '/dashboard'
    }
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden hero-grid-pattern">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 blur-3xl rounded-full pointer-events-none -z-10 animate-pulse-glow" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-soft text-blue-700 text-xs font-semibold mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Official Government Municipal Facility & Citizen Services System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Modern Administration for{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent underline decoration-blue-300 decoration-wavy decoration-2">
              {displayText}
            </span>
            <span className="text-blue-600 animate-pulse font-light">|</span>
            <br />
            Made Seamless.
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Centralizing government-owned facility bookings, park schedules, cemetery plot registries, and emergency water & drainage requests with AI Decision Support.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/portal">
              <Button size="lg" className="w-full sm:w-auto shadow-blue text-base font-bold" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Launch Public Citizen Portal
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base font-semibold">
                Access Staff Management Shell
              </Button>
            </Link>
          </div>

          {/* Quick Tracking Search Bar */}
          <div className="mt-12 max-w-xl mx-auto p-2 bg-white rounded-2xl shadow-medium border border-[#cbd5e1] flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
            <input
              type="text"
              placeholder="Track reservation, permit or utility ticket (e.g. RES-2026-101)..."
              className="flex-1 text-sm bg-transparent border-none outline-none text-[#0f172a] placeholder:text-slate-400 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.currentTarget.value.trim();
                  if (target) window.location.href = `/portal?ref=${encodeURIComponent(target)}`;
                }
              }}
            />
            <Link to="/portal">
              <Button size="sm" variant="primary">
                Track
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Capabilities Feature Grid */}
      <section id="features" className="py-16 md:py-24 bg-white border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="info" className="mb-3">Municipal Operations</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0f172a]">
              7 Specialized Modules for Transparent Governance
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#64748b]">
              Streamlining facilities, open spaces, vital records, utility emergencies, and asset maintenance in one central hub.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <Card key={idx} hoverEffect className="group flex flex-col justify-between border-[#e2e8f0] p-7">
                  <div>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${cap.color} flex items-center justify-center text-white shadow-md mb-5 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0f172a] mb-2 font-display">{cap.title}</h3>
                    <p className="text-xs sm:text-sm text-[#64748b] leading-relaxed">{cap.description}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link to={cap.link} className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                      <span>Access Module</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <span className="text-[10px] text-slate-400 font-medium">Digital Workflow</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-[#e2e8f0] text-center text-xs text-[#64748b]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-[#0f172a]">GOVSERVE</span>
            <span>© 2026 Local Government Facility, Cemetery & Citizen Services Platform.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/portal" className="hover:text-blue-600">Public Portal</Link>
            <Link to="/dashboard" className="hover:text-blue-600">Staff Portal</Link>
            <Link to="/login" className="hover:text-blue-600">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
