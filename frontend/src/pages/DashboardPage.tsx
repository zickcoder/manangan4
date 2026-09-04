import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  Wrench, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ArrowUpRight, 
  Plus, 
  ArrowRight, 
  Activity, 
  Send, 
  ShieldCheck, 
  Calendar, 
  PhoneCall, 
  BellRing, 
  ExternalLink, 
  User, 
  FileText, 
  MapPin, 
  Eye, 
  Check, 
  QrCode, 
  Image as ImageIcon, 
  Filter, 
  Search, 
  Printer,
  Newspaper,
  Megaphone,
  Sparkles
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { 
  fetchStats, 
  fetchReservations, 
  fetchUtilities, 
  fetchBurials, 
  fetchAssets, 
  updateReservationStatus, 
  updateUtilityStatus, 
  fetchActivityLogs,
  cancelReservation,
  cancelUtilityRequest,
  cancelBurial
} from "../lib/api";
import { DashboardStats, FacilityReservation, UtilityRequest, BurialRecord, Asset, ActivityLog } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  RadialBarChart, RadialBar
} from "recharts";

export function DashboardPage() {
  const navigate = useNavigate();

  const userStr = sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user');
  let user: any = { name: 'Executive Administrator', role: 'Super Admin', email: 'admin@govserve.gov.ph' };
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const isCitizen = user?.role === 'Citizen';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allReservations, setAllReservations] = useState<FacilityReservation[]>([]);
  const [allUtilities, setAllUtilities] = useState<UtilityRequest[]>([]);
  const [allBurials, setAllBurials] = useState<BurialRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // QC News State for Citizen Dashboard
  const [newsCategory, setNewsCategory] = useState('All');
  const [newsSearch, setNewsSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, resData, utilData, burData, astData, actData] = await Promise.all([
        fetchStats(), 
        fetchReservations("all","all"), 
        fetchUtilities("all","all"), 
        fetchBurials(),
        fetchAssets(),
        fetchActivityLogs(),
      ]);
      setStats(statsData); 
      setAllReservations(resData); 
      setAllUtilities(utilData); 
      setAllBurials(burData);
      setAssets(astData);
      setActivity(actData.slice(0,8));
    } catch(e){ 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);



  // =========================================================================
  // RENDER CITIZEN DASHBOARD (QC NEWS)
  // =========================================================================
  if (isCitizen) {
    const QC_NEWS_ARTICLES = [
      {
        id: 1,
        title: "Quezon City Local Government Expands 24/7 Digital Public Asset & Facility Telemetry for Residents",
        category: "Public Service",
        badgeVariant: "info",
        date: "September 4, 2026",
        readTime: "4 min read",
        author: "Office of the City Mayor • QC Information Bureau",
        image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80",
        summary: "Mayor and City Council enact modernized digital governance guidelines enabling instant online reservations for multi-purpose civic centers, expedited drainage maintenance desks, and digitized columbarium records across all barangays.",
        fullContent: `QUEZON CITY — In an effort to modernize municipal governance and make public assets easily accessible to every resident, the Quezon City Local Government Unit (QC LGU) today officially introduced upgraded digital citizen telemetry and e-services.\n\nUnder the new administrative order, residents can transparently check availability and book municipal gymnasiums, amphitheaters, and parks without navigating bureaucratic paperwork. Furthermore, requests for drainage dredging and canal repairs now undergo automated priority analysis for fast crew dispatch.\n\n"Public facilities belong to the people," the City Administrator stated. "By connecting our physical infrastructure—from heavy maintenance equipment to columbarium niches—to an integrated public portal, we ensure equity, transparency, and accountability for every community member."`
      },
      {
        id: 2,
        title: "Engineering Dept Completes Major Canal Desilting & Drainage Upgrade Across Sector 4",
        category: "Infrastructure",
        badgeVariant: "warning",
        date: "September 3, 2026",
        readTime: "3 min read",
        author: "City Engineering & Public Works Office",
        image: "https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800&auto=format&fit=crop&q=80",
        summary: "Maintenance crews have cleared over 45 metric tons of silt and reinforced drainage embankments along critical tributaries to ensure flood prevention ahead of upcoming monsoon rains.",
        fullContent: `QUEZON CITY — The City Engineering and Public Works department announced the early completion of canal desilting and water culvert rehabilitation in Sector 4 and surrounding residential zones.\n\nHeavy excavator equipment, newly registered under the city asset fleet, operated continuously for 72 hours clearing blockages, removing plastic refuse, and widening narrow waterway funnels. Water flow velocity has improved by an estimated 65%, significantly diminishing localized flash-flood risks during heavy weather events.\n\nResidents who encounter localized street flooding or drainage leaks are urged to log an incident report via the Citizen Water & Drainage Desk for prompt inspector evaluation.`
      },
      {
        id: 3,
        title: "Barangay 178 Multi-Purpose Civic Gym Reopens With Free Weekend Youth Sports Programs",
        category: "Parks & Recreation",
        badgeVariant: "success",
        date: "September 2, 2026",
        readTime: "2 min read",
        author: "Department of Community Recreation & Sports",
        image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80",
        summary: "Following extensive renovations including hardwood refinishing and LED scoreboard installations, community sports leagues and youth clinics may now book weekend slots with zero facility fees.",
        fullContent: `QUEZON CITY — Community athletics received a major boost this weekend as the newly renovated Barangay 178 Multi-Purpose Civic Center opened its doors. The facility features shock-absorbent timber flooring, digital electronic scoreboards, renovated locker rooms, and an auxiliary diesel generator.\n\nUnder the QC Youth Development ordinance, community youth leagues and barangay sports tournaments can apply for weekend slots free of charge. Civic bookings for assemblies, wellness programs, and cultural exhibitions may also be filed 48 hours in advance through the online facility reservation portal.`
      },
      {
        id: 4,
        title: "Municipal Memorial Modernization: Columbarium Wall Alpha Reaches 95% Completion",
        category: "Public Memorials",
        badgeVariant: "purple",
        date: "August 30, 2026",
        readTime: "3 min read",
        author: "Cemetery & Sanitary Services Division",
        image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&auto=format&fit=crop&q=80",
        summary: "Over 80 newly sanitized columbarium niches are now mapped onto an interactive digital coordinates grid with transparent pricing and dignity-centered memorial services.",
        fullContent: `QUEZON CITY — As part of the municipal cemetery expansion program, the local government has completed 95% of Columbarium Wall Alpha at Barangay 178 Municipal Cemetery. The newly constructed structure offers dignified, modular memorial niches in an 8-row by 10-column organized grid.\n\nThe digital system allows families to view niche availability online, verify lot numbers, submit death certificates, and pay assessment dues face-to-face at the city treasury desk. The division reaffirmed its commitment to compassionate, orderly, and hygienic memorial administration.`
      },
      {
        id: 5,
        title: "QC Health Department & Sanitary Bureau Launch Clean Tap Water Testing Drive",
        category: "Health & Sanitation",
        badgeVariant: "info",
        date: "August 28, 2026",
        readTime: "3 min read",
        author: "City Health Department",
        image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80",
        summary: "Mobile water testing laboratories are inspecting residential piping connections, testing microbial safety, and distributing free chlorine testing tablets to local households.",
        fullContent: `QUEZON CITY — Dedicated mobile health teams began street-level potability sampling across several residential communities today. The joint campaign between the City Health Department and Metropolitan Water Utilities checks residual chlorine concentrations and verifies pressure integrity in main distribution pipes.\n\nInspectors reported that 98.4% of municipal samples met or exceeded Philippine National Standards for Drinking Water (PNSDW). Free chlorine water test kits are also being distributed at barangay health centers.`
      },
      {
        id: 6,
        title: "Camarin Green Urban Recreation Park Installs 100% Solar-Powered Lighting System",
        category: "Sustainability",
        badgeVariant: "success",
        date: "August 26, 2026",
        readTime: "2 min read",
        author: "Environmental Protection & Waste Management Dept",
        image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&auto=format&fit=crop&q=80",
        summary: "Jogging trails and outdoor children's playgrounds are now illuminated by smart solar lamps equipped with lithium battery storage, reducing civic electrical carbon footprints.",
        fullContent: `QUEZON CITY — Continuing the green city agenda, Camarin Green Urban Recreation Park has unveiled a state-of-the-art perimeter solar lighting grid. A total of 42 high-lumen solar street fixtures now line the jogging loop and community playground.\n\nThe solar fixtures automatically adjust brightness based on ambient dusk lighting and store sufficient energy to withstand up to four consecutive overcast rainy days. The project is part of Quezon City's commitment to climate resilience and safe public community spaces.`
      },
      {
        id: 7,
        title: "Barangay One-Stop Social Services Caravan Schedule Announced for September 2026",
        category: "Civic Services",
        badgeVariant: "warning",
        date: "August 24, 2026",
        readTime: "4 min read",
        author: "QC Social Services & Citizen Welfare Bureau",
        image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
        summary: "Residents can access free legal notarization, senior citizen card processing, municipal burial assistance consultations, and digital portal enrollment on scheduled Saturdays.",
        fullContent: `QUEZON CITY — The city government has published the quarterly itinerary for the mobile Citizen Assistance Caravan. The mobile outreach brings essential desk services directly to basketball courts and multi-purpose civic plazas on alternating weekends.\n\nServices provided on-site include PSA document validation, burial aid subsidies for indigent families, voter verification guidance, and assistance for non-technical residents to file public utility tickets on the GOVSERVE platform.`
      }
    ];

    const categories = ['All', 'Infrastructure', 'Parks & Recreation', 'Public Memorials', 'Health & Sanitation', 'Sustainability', 'Civic Services'];

    const filteredArticles = QC_NEWS_ARTICLES.filter(article => {
      const matchesCat = newsCategory === 'All' || article.category === newsCategory;
      const matchesSearch = !newsSearch.trim() || 
        article.title.toLowerCase().includes(newsSearch.toLowerCase()) ||
        article.summary.toLowerCase().includes(newsSearch.toLowerCase()) ||
        article.category.toLowerCase().includes(newsSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });

    const heroArticle = QC_NEWS_ARTICLES[0];
    const showHero = newsCategory === 'All' && !newsSearch.trim();
    const displayList = showHero 
      ? filteredArticles.filter(a => a.id !== heroArticle.id) 
      : filteredArticles;

    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display">
                    QC News
                  </h2>
                  <Badge variant="info" size="sm">Official Public Updates</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quezon City official news bulletins, public works advisories, and community developments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Public Advisory Notice */}
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-soft">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
              <Megaphone className="w-4 h-4 animate-bounce" />
            </span>
            <div>
              <p className="text-amber-950 font-medium leading-relaxed">
                <strong className="font-bold uppercase tracking-wider text-amber-800 mr-1.5">[LIVE PUBLIC ADVISORY]</strong>
                City Engineering & Public Works ongoing desilting and canal dredging operations across low-lying barangays. Emergency hotline <strong>122</strong> is on standby 24/7.
              </p>
            </div>
          </div>
          <Badge variant="warning" size="sm" className="shrink-0 hidden md:inline-flex">
            Priority Bulletin
          </Badge>
        </div>

        {/* Category Selector & Search Input */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-soft">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setNewsCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  newsCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={newsSearch}
              onChange={(e) => setNewsSearch(e.target.value)}
              placeholder="Search news or advisories..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 transition-all"
            />
            {newsSearch && (
              <button
                onClick={() => setNewsSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid: Articles on Left, Hotlines & Advisories on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: News Articles Feed */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Featured Hero Story (Only shown on "All" when not searching) */}
            {showHero && (
              <Card 
                onClick={() => setSelectedArticle(heroArticle)}
                className="overflow-hidden border-slate-200 shadow-soft hover:shadow-md transition-all cursor-pointer group bg-white"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative h-56 md:h-full overflow-hidden bg-slate-100">
                    <img
                      src={heroArticle.image}
                      alt={heroArticle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Featured Story
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-bold text-blue-600 uppercase tracking-wide">{heroArticle.category}</span>
                        <span>•</span>
                        <span>{heroArticle.date}</span>
                        <span>•</span>
                        <span>{heroArticle.readTime}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 font-display group-hover:text-blue-600 transition-colors leading-snug">
                        {heroArticle.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {heroArticle.summary}
                      </p>
                    </div>
                    <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-4">
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                        {heroArticle.author}
                      </span>
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Read Story <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Articles List / Grid */}
            {displayList.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-slate-300">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No news articles found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search keywords or switch back to the "All" category.
                </p>
                <button
                  onClick={() => { setNewsCategory('All'); setNewsSearch(''); }}
                  className="mt-3 text-xs text-blue-600 font-bold hover:underline"
                >
                  Clear Filters
                </button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayList.map((article) => (
                  <Card
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="overflow-hidden border-slate-200 shadow-soft hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-white"
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden bg-slate-100">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <Badge variant={article.badgeVariant as any} size="sm">
                            {article.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{article.date}</span>
                          <span>•</span>
                          <span>{article.readTime}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                          {article.title}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-slate-50 text-[11px]">
                      <span className="text-slate-400 text-[10px] truncate max-w-[140px]">
                        {article.author}
                      </span>
                      <span className="font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Hotlines, Advisories & Fast Links */}
          <div className="space-y-6">
            {/* Official Hotlines Card */}
            <Card className="border-slate-200 shadow-soft overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                    <PhoneCall className="w-4 h-4 text-blue-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider">QC Emergency Hotlines</h4>
                    <p className="text-[10px] text-blue-200">24/7 Citizen Response Services</p>
                  </div>
                </div>
                <Badge variant="success" size="sm">Online</Badge>
              </div>
              <CardContent className="p-4 space-y-3 divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-bold text-slate-900">Quezon City Central Hotline</span>
                    <p className="text-[10px] text-slate-500">Police, Fire, Medical, Public Safety</p>
                  </div>
                  <span className="font-mono font-extrabold text-blue-600 text-sm px-2.5 py-1 bg-blue-50 rounded-lg">
                    122
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="font-bold text-slate-900">Disaster Risk Reduction (QC DRRMO)</span>
                    <p className="text-[10px] text-slate-500">Typhoon, Floods & Evacuation</p>
                  </div>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    (02) 8927-5914
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="font-bold text-slate-900">Water & Drainage Quick Action</span>
                    <p className="text-[10px] text-slate-500">Canal dredging & main pipe bursts</p>
                  </div>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    Loc. 1400
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="font-bold text-slate-900">Barangay 178 Action Desk</span>
                    <p className="text-[10px] text-slate-500">Local community assistance</p>
                  </div>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    +63 917 888 1111
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Community Schedules */}
            <Card className="border-slate-200 shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div>
                    <CardTitle className="text-sm">Civic Activity Calendar</CardTitle>
                    <CardDescription className="text-[10px]">Barangay announcements for September 2026</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex flex-col items-center justify-center shrink-0 font-bold leading-tight">
                    <span className="text-[9px] uppercase">SEP</span>
                    <span className="text-xs">12</span>
                  </div>
                  <div>
                    <span className="font-bold text-blue-950 text-xs">General Barangay Assembly</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">Community Hall • 9:00 AM • Annual budget presentation & open forum.</p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex flex-col items-center justify-center shrink-0 font-bold leading-tight">
                    <span className="text-[9px] uppercase">SEP</span>
                    <span className="text-xs">19</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 text-xs">Mega Clean-Up & Tree Planting</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">Camarin Green Park • 6:30 AM • Seedlings and cleanup gear provided.</p>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex flex-col items-center justify-center shrink-0 font-bold leading-tight">
                    <span className="text-[9px] uppercase">SEP</span>
                    <span className="text-xs">26</span>
                  </div>
                  <div>
                    <span className="font-bold text-purple-950 text-xs">Senior Citizen Free Health Check</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">Barangay Health Center • 8:00 AM - 2:00 PM • Free maintenance vitamins.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Citizen E-Services Gateway */}
            <Card className="border-slate-200 shadow-soft bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Direct Access</span>
                <h4 className="font-bold text-sm">Need to File a Municipal Request?</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Access digital forms for facility bookings, water repairs, or cemetery permits without waiting in lines.
                </p>
                <div className="pt-2 flex flex-col gap-1.5">
                  <Link to="/facilities" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between text-xs font-semibold">
                    <span>Reserve Civic Facility</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-300" />
                  </Link>
                  <Link to="/utilities" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between text-xs font-semibold">
                    <span>Report Drainage Hazard</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-300" />
                  </Link>
                  <Link to="/my-tickets" className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-between text-xs font-bold text-white shadow-sm">
                    <span>View My Submitted Tickets</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Modal: Full Article Reader */}
        <Modal
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
          title={selectedArticle?.category || "QC News Bulletin"}
          description={selectedArticle?.author || "Quezon City Local Government"}
          maxWidth="2xl"
        >
          {selectedArticle && (
            <div className="space-y-4">
              <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant={selectedArticle.badgeVariant as any} size="md">
                    {selectedArticle.category}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-700">{selectedArticle.date}</span>
                <span>•</span>
                <span>{selectedArticle.readTime}</span>
                <span>•</span>
                <span className="font-medium text-blue-600">{selectedArticle.author}</span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 font-display leading-snug">
                {selectedArticle.title}
              </h3>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs font-medium text-blue-950 leading-relaxed">
                💡 <strong>Executive Summary:</strong> {selectedArticle.summary}
              </div>

              <div className="text-xs text-slate-700 leading-relaxed space-y-3 whitespace-pre-line pt-2">
                {selectedArticle.fullContent}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button size="sm" variant="primary" onClick={() => setSelectedArticle(null)}>
                  Close Article
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // RENDER SUPER ADMIN EXECUTIVE REPORTING & SYSTEM ANALYTICS DASHBOARD
  // =========================================================================
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display">
              Executive Reporting & System Analytics
            </h2>
            <Badge variant="purple" size="sm">Admin Console</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive operational telemetry across facilities, cemetery plots, water/drainage, and asset fleet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Refresh Data
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 font-bold text-xs"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Executive Summary
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate("/facilities")} className="text-left group">
          <Card className="border-l-4 border-l-blue-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facility & Park Bookings</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Building className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{allReservations.length}</span>
              <span className="text-[11px] text-amber-600 font-semibold ml-2">
                ({allReservations.filter(r => r.status === 'Pending').length} Pending)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.totalFacilities || 4} Total Managed Spaces</p>
            <p className="text-[10px] text-blue-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Manage Facilities <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/cemetery")} className="text-left group">
          <Card className="border-l-4 border-l-purple-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cemetery Plot Occupancy</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all"><Cross className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{stats?.occupiedPlots ?? 8} / {stats?.totalCemeteryPlots ?? 90}</span>
              <Badge variant="purple" className="ml-2">{stats?.availablePlots ?? 82} Available</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{allBurials.length} Registered Burials</p>
            <p className="text-[10px] text-purple-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Manage Cemetery <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/utilities")} className="text-left group">
          <Card className="border-l-4 border-l-cyan-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Water & Drainage Desk</span>
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all"><Droplet className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{allUtilities.length}</span>
              <Badge variant="warning" className="ml-2">Active Response</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">AI prioritized emergency triage</p>
            <p className="text-[10px] text-cyan-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View Tickets <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/assets")} className="text-left group">
          <Card className="border-l-4 border-l-amber-500 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Fleet Status</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all"><Wrench className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{assets.length} Units</span>
              <Badge variant="success" className="ml-2">Operational</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Backhoes, tankers, flood pumps</p>
            <p className="text-[10px] text-amber-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Inspect Assets <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Facility Booking Pipeline (Bar Chart) — Navigates to /facilities */}
        {(() => {
          const statusCounts: Record<string, number> = {};
          allReservations.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
          const data = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
          const COLORS: Record<string, string> = {
            'Pending': '#f59e0b', 'Pending Review': '#fb923c', 'Approved': '#22c55e',
            'Pending Payment': '#3b82f6', 'Paid': '#10b981', 'Rejected': '#ef4444'
          };
          return (
            <Card 
              onClick={() => navigate('/facilities')}
              className="border-2 border-slate-300 shadow-md rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:border-blue-500 hover:-translate-y-0.5 group"
              title="Click to view Facilities Module"
            >
              <div className="px-5 pt-4 pb-2 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">Facility Reservation Pipeline</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 opacity-90 group-hover:opacity-100">
                  <span>View Facilities</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="p-4 bg-white">
                <div className="text-[11px] text-slate-500 mb-2 font-medium">Breakdown of reservation records by current processing stage</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.length ? data : [{name:'No Data',value:0}]} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={{ stroke: '#94a3b8' }} tickLine={false} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#334155' }} axisLine={{ stroke: '#94a3b8' }} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 10, border: '1.5px solid #94a3b8', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
                      cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    />
                    <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={52}>
                      {data.map((entry, i) => (
                        <Cell key={i} fill={COLORS[entry.name] || '#6366f1'} stroke={COLORS[entry.name] || '#6366f1'} strokeWidth={1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })()}

        {/* 2. Department Operations Summary (Grouped Bar) — Navigates to /reports */}
        {(() => {
          const data = [
            { module: 'Facilities', total: allReservations.length, approved: allReservations.filter(r=>r.status==='Approved'||r.status==='Paid').length },
            { module: 'Cemetery', total: allBurials.length, approved: allBurials.filter((b:any)=>b.status==='Approved').length },
            { module: 'Utilities', total: allUtilities.length, approved: allUtilities.filter(u=>u.status==='Resolved').length },
            { module: 'Assets', total: assets.length, approved: assets.length },
          ];
          return (
            <Card 
              onClick={() => navigate('/reports')}
              className="border-2 border-slate-300 shadow-md rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:border-purple-500 hover:-translate-y-0.5 group"
              title="Click to view Comprehensive Reports"
            >
              <div className="px-5 pt-4 pb-2 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-sm text-slate-800 group-hover:text-purple-600 transition-colors">Cross-Department Operations</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 opacity-90 group-hover:opacity-100">
                  <span>View Reports</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="p-4 bg-white">
                <div className="text-[11px] text-slate-500 mb-2 font-medium">Comparison of total workload vs completed/approved records</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="module" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={{ stroke: '#94a3b8' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#334155' }} axisLine={{ stroke: '#94a3b8' }} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1.5px solid #94a3b8', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} cursor={{ fill: 'rgba(167,139,250,0.08)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 4 }} />
                    <Bar dataKey="total" name="Total Filed" fill="#a78bfa" stroke="#7c3aed" strokeWidth={1} radius={[6,6,0,0]} maxBarSize={36} />
                    <Bar dataKey="approved" name="Approved / Resolved" fill="#22c55e" stroke="#16a34a" strokeWidth={1} radius={[6,6,0,0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })()}

      </div>


    </div>
  );
}
