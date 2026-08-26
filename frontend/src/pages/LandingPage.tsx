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
  Bot,
  LogIn,
  UserPlus
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PublicNavbar } from '../components/layout/PublicNavbar';

export function LandingPage() {
  const phrases = [
    'Facility Reservations',
    'Parks & Recreation Booking',
    'Cemetery & Burial Records',
    'Water & Drainage Incident Desk',
    'Asset Transparency Management'
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
      title: 'Facility & Park Reservation',
      icon: Building,
      color: 'from-blue-600 to-indigo-600',
      description: 'Online booking and scheduling for Multi-Purpose Civic Centers, Sports Gymnasiums, and Community Amphitheaters with AI conflict prevention.',
      link: '/login'
    },
    {
      title: 'Water & Drainage Rapid Triage',
      icon: Droplet,
      color: 'from-cyan-500 to-blue-600',
      description: 'Citizen incident reporting for pipe leaks, storm canal declogging, sewer overflows, and flash flood dewatering with photo upload.',
      link: '/login'
    },
    {
      title: 'Cemetery & Burial Permits',
      icon: Cross,
      color: 'from-purple-500 to-violet-600',
      description: 'Interactive Columbarium marble wall map (80 niches), lawn lot plot selection, and digital 5-section burial permit application.',
      link: '/login'
    },
    {
      title: 'Public Asset Transparency Catalog',
      icon: Wrench,
      color: 'from-amber-500 to-orange-600',
      description: 'Open public directory of government service vehicles, heavy excavator backhoes, emergency water tankers, and flood pumps.',
      link: '/login'
    }
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-[#e2e8f0]">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-canvas pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* LGU Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Official Local Government Portal</span>
            </div>

            {/* Main Headline with Typewriter */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display text-[#0f172a] tracking-tight leading-[1.12]">
              Public Assets & Facilities Management for{' '}
              <span className="text-blue-600 inline-block min-w-[280px] text-left">
                {displayText}
                <span className="animate-pulse">|</span>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-[#475569] max-w-2xl mx-auto leading-relaxed">
              Unified digital platform for local residents to book government facilities & parks, report water/drainage hazards, register burial permits, and monitor public transparency.
            </p>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full font-bold shadow-blue shadow-lg" rightIcon={<LogIn className="w-4 h-4" />}>
                  Citizen Sign In to Access Services
                </Button>
              </Link>

              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full font-bold" leftIcon={<UserPlus className="w-4 h-4" />}>
                  Create an Account
                </Button>
              </Link>
            </div>

            <p className="text-xs text-slate-500 pt-1">
              Are you an LGU Employee?{' '}
              <Link to="/admin/login" className="font-bold text-blue-600 hover:underline">
                Sign in to Staff / Admin Console →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="services" className="py-16 bg-white border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0f172a]">
              Integrated Municipal E-Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Sign in with your citizen account to access automated scheduling, incident filing, and status tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <Link to={cap.link} key={idx} className="block group h-full">
                  <Card className="h-full border-[#cbd5e1] p-6 hover:shadow-medium hover:border-blue-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${cap.color} text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-[#0f172a] font-display mb-2">{cap.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{cap.description}</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:underline">
                      <span>Sign In to Access</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-10 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold font-display text-white">GOVSERVE • LGU</span>
            <span>• Public Assets & Facilities Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-white">Citizen Login</Link>
            <Link to="/register" className="hover:text-white">Register</Link>
            <Link to="/admin/login" className="hover:text-white">Admin Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
