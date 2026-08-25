import React, { useState, useEffect } from 'react';
import { 
  Cross, 
  Plus, 
  FileText, 
  Printer, 
  PlusCircle,
  Search,
  ChevronRight,
  User,
  Calendar,
  Phone,
  Tag
} from 'lucide-react';
import { Card, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  fetchCemeteries,
  fetchCemeteryPlots, 
  updatePlotStatus, 
  fetchBurials, 
  createBurial, 
  createBatchPlots 
} from '../lib/api';
import { CemeteryPlot, BurialRecord } from '../types';

export function CemeteryModule() {
  const [cemeteries, setCemeteries] = useState<string[]>([]);
  const [selectedCemetery, setSelectedCemetery] = useState<string>('all');
  const [plots, setPlots] = useState<CemeteryPlot[]>([]);
  const [burials, setBurials] = useState<BurialRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'plots' | 'burials'>('plots');
  const [searchQuery, setSearchQuery] = useState('');
  const [plotSearch, setPlotSearch] = useState('');
  const [plotFilter, setPlotFilter] = useState<'All' | 'Available' | 'Reserved' | 'Occupied'>('All');

  // Modals
  const [isNewBurialOpen, setIsNewBurialOpen] = useState(false);
  const [isBatchPlotsOpen, setIsBatchPlotsOpen] = useState(false);
  const [selectedBurial, setSelectedBurial] = useState<BurialRecord | null>(null);
  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
  
  // Quick Plot Status Manager Modal
  const [selectedPlotToManage, setSelectedPlotToManage] = useState<CemeteryPlot | null>(null);
  const [isManagePlotOpen, setIsManagePlotOpen] = useState(false);
  const [newPlotStatus, setNewPlotStatus] = useState<string>('Available');

  // Forms
  const [newBurialForm, setNewBurialForm] = useState({
    deceased_name: '',
    date_of_death: new Date().toISOString().split('T')[0],
    burial_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    plot_id: 1,
    contact_person: '',
    contact_phone: '',
  });

  const [batchForm, setBatchForm] = useState({
    cemetery_name: 'Barangay 178 Municipal Cemetery',
    section: 'Columbarium Expansion Beta',
    plot_type: 'Columbarium Niche',
    prefix: 'COL-EXP',
    count: '24',
    start_index: '1',
    price: '18000',
  });

  const loadData = async () => {
    try {
      const [cems, plotData, burialData] = await Promise.all([
        fetchCemeteries(),
        fetchCemeteryPlots('all', 'all', selectedCemetery),
        fetchBurials(),
      ]);
      setCemeteries(cems);
      setPlots(plotData);
      setBurials(burialData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCemetery]);

  const handleCreateBurial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBurial(newBurialForm);
      setIsNewBurialOpen(false);
      loadData();
      alert('Burial permit registered successfully!');
    } catch (e) {
      alert('Failed to register burial');
    }
  };

  const handleCreateBatchPlots = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBatchPlots(batchForm);
      setIsBatchPlotsOpen(false);
      loadData();
      alert(`Successfully generated ${batchForm.count} new slots!`);
    } catch (e) {
      alert('Failed to add batch slots');
    }
  };

  const handleOpenPlotManager = (plot: CemeteryPlot) => {
    setSelectedPlotToManage(plot);
    setNewPlotStatus(plot.status);
    setIsManagePlotOpen(true);
  };

  const handleSavePlotStatus = async () => {
    if (!selectedPlotToManage) return;
    try {
      await updatePlotStatus(selectedPlotToManage.id, newPlotStatus);
      setIsManagePlotOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to update plot status');
    }
  };

  const filteredBurials = burials.filter(b =>
    b.deceased_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.permit_no && b.permit_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPlots = plots.length;
  const occupiedCount = plots.filter(p => p.status === 'Occupied').length;
  const availableCount = plots.filter(p => p.status === 'Available').length;
  const reservedCount = plots.filter(p => p.status === 'Reserved').length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-sm shrink-0">
              <Cross className="w-4 h-4 sm:w-5 h-5" />
            </div>
            <span className="truncate">Cemetery & Burial Services</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Digital Columbarium niche grid, plot mapping, deceased records, and burial permits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-xs font-semibold"
            leftIcon={<PlusCircle className="w-4 h-4 text-purple-600 shrink-0" />}
            onClick={() => setIsBatchPlotsOpen(true)}
          >
            Add Slots / Expansion
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 font-bold text-xs"
            leftIcon={<Plus className="w-4 h-4 shrink-0" />}
            onClick={() => setIsNewBurialOpen(true)}
          >
            Issue Burial Permit
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards (Clickable to filter plot grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('plots');
            setPlotFilter('All');
          }}
          className={`text-left rounded-2xl transition-all ${plotFilter === 'All' && activeSubTab === 'plots' ? 'ring-2 ring-purple-600 shadow-md' : 'hover:shadow-sm'}`}
        >
          <Card className="p-3 sm:p-4 border-slate-200 h-full cursor-pointer hover:border-purple-300">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate block">Total Slots</span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display mt-0.5">{totalPlots}</p>
            <span className="text-[9px] sm:text-[10px] text-purple-600 font-semibold truncate block mt-1">View all →</span>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('plots');
            setPlotFilter('Available');
          }}
          className={`text-left rounded-2xl transition-all ${plotFilter === 'Available' && activeSubTab === 'plots' ? 'ring-2 ring-emerald-600 shadow-md' : 'hover:shadow-sm'}`}
        >
          <Card className="p-3 sm:p-4 border-slate-200 h-full cursor-pointer hover:border-emerald-300">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase truncate block">Available</span>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-display mt-0.5">{availableCount}</p>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate block mt-1">Filter Available →</span>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('plots');
            setPlotFilter('Reserved');
          }}
          className={`text-left rounded-2xl transition-all ${plotFilter === 'Reserved' && activeSubTab === 'plots' ? 'ring-2 ring-amber-600 shadow-md' : 'hover:shadow-sm'}`}
        >
          <Card className="p-3 sm:p-4 border-slate-200 h-full cursor-pointer hover:border-amber-300">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase truncate block">Reserved</span>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-600 font-display mt-0.5">{reservedCount}</p>
            <span className="text-[9px] sm:text-[10px] text-amber-600 font-semibold truncate block mt-1">Filter Reserved →</span>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('plots');
            setPlotFilter('Occupied');
          }}
          className={`text-left rounded-2xl transition-all ${plotFilter === 'Occupied' && activeSubTab === 'plots' ? 'ring-2 ring-purple-700 shadow-md' : 'hover:shadow-sm'}`}
        >
          <Card className="p-3 sm:p-4 border-slate-200 h-full cursor-pointer hover:border-purple-400">
            <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 uppercase truncate block">Occupied (✝)</span>
            <p className="text-xl sm:text-2xl font-extrabold text-purple-700 font-display mt-0.5">{occupiedCount}</p>
            <span className="text-[9px] sm:text-[10px] text-purple-700 font-semibold truncate block mt-1">Filter Occupied →</span>
          </Card>
        </button>
      </div>

      {/* Cemetery Filter Bar & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('plots')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'plots' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            Plot & Columbarium Map ({plots.length})
          </button>
          <button
            onClick={() => setActiveSubTab('burials')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'burials' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            Deceased Registry ({burials.length})
          </button>
        </div>

        {/* Cemetery Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">Cemetery:</span>
          <select
            value={selectedCemetery}
            onChange={(e) => setSelectedCemetery(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">Barangay 178 Municipal Cemetery</option>
            {cemeteries.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================================
          SUB-TAB 1: INTERACTIVE PLOT MAP GRID
         ========================================================================= */}
      {activeSubTab === 'plots' && (
        <Card className="border-slate-200 p-3 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">Columbarium Wall Niches & Lawn Lots</CardTitle>
              <CardDescription className="text-xs">Tap any vault/lot to view details or update status.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Reserved</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Occupied (✝)</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-2 pt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search deceased name, vault code (e.g. COL-R01-C01)..."
                value={plotSearch}
                onChange={(e) => setPlotSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {(['All', 'Available', 'Reserved', 'Occupied'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPlotFilter(f)}
                  className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0 ${
                    plotFilter === f
                      ? f === 'Available'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : f === 'Reserved'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : f === 'Occupied'
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Plots Grid */}
          {(() => {
            const filtered = plots.filter(p => {
              const matchesStatus = plotFilter === 'All' || p.status === plotFilter;
              const q = plotSearch.toLowerCase();
              const matchesSearch = !q ||
                p.plot_code.toLowerCase().includes(q) ||
                p.lot_no.toLowerCase().includes(q) ||
                p.section.toLowerCase().includes(q) ||
                p.block_no.toLowerCase().includes(q) ||
                (p.deceased_name && p.deceased_name.toLowerCase().includes(q));
              return matchesStatus && matchesSearch;
            });

            return (
              <>
                <p className="text-[11px] text-slate-400 font-medium">
                  Showing {filtered.length} of {plots.length} slots
                  {plotFilter !== 'All' && <span className="text-purple-600 font-bold"> · {plotFilter}</span>}
                  {plotSearch && <span className="text-purple-600 font-bold"> · "{plotSearch}"</span>}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-2.5 max-h-[560px] overflow-y-auto pr-1">
                  {filtered.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-semibold">No slots match your search</p>
                      <p className="text-xs mt-1">Try a different filter or search term</p>
                    </div>
                  ) : (
                    filtered.map((plot) => (
                      <div
                        key={plot.id}
                        onClick={() => handleOpenPlotManager(plot)}
                        className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                          plot.status === 'Available'
                            ? 'bg-emerald-50/80 border-emerald-300 hover:border-emerald-500 hover:shadow-soft'
                            : plot.status === 'Reserved'
                            ? 'bg-amber-50/80 border-amber-300 hover:border-amber-500 hover:shadow-soft'
                            : 'bg-slate-100 border-slate-300 hover:border-slate-400 opacity-90'
                        }`}
                        title={`Tap to manage: ${plot.plot_code}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[11px] font-extrabold text-slate-900 truncate">{plot.plot_code}</span>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            plot.status === 'Available' ? 'bg-emerald-500' : plot.status === 'Reserved' ? 'bg-amber-400' : 'bg-slate-600'
                          }`}></span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 mt-1 truncate">{plot.lot_no}</p>
                        {plot.deceased_name ? (
                          <p className="text-[10px] font-extrabold text-purple-900 truncate mt-0.5" title={plot.deceased_name}>
                            🕊️ {plot.deceased_name}
                          </p>
                        ) : null}
                        <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-slate-200/60 text-[9px]">
                          <span className="text-slate-500 truncate">{plot.plot_type.replace('Columbarium ', '')}</span>
                          <Badge variant={plot.status === 'Available' ? 'success' : plot.status === 'Reserved' ? 'warning' : 'default'} size="sm">
                            {plot.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            );
          })()}
        </Card>
      )}

      {/* =========================================================================
          SUB-TAB 2: DECEASED REGISTRY & PERMITS (Responsive Table + Mobile Cards)
         ========================================================================= */}
      {activeSubTab === 'burials' && (
        <Card className="border-slate-200">
          {/* Search Header for Burials */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search deceased name, reference no, or permit code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 bg-white font-medium"
              />
            </div>
          </div>

          <CardContent className="p-0">
            {/* Desktop Table View (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">Permit No</th>
                    <th className="py-3 px-4">Deceased Name</th>
                    <th className="py-3 px-4">Date of Death</th>
                    <th className="py-3 px-4">Interment Date</th>
                    <th className="py-3 px-4">Allocated Plot</th>
                    <th className="py-3 px-4">Next of Kin</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBurials.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{b.permit_no || 'BP-PENDING'}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{b.deceased_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Ref: {b.reference_no}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{new Date(b.date_of_death).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{new Date(b.burial_date).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {b.plot_code || 'Plot Assigned'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="font-semibold">{b.contact_person}</p>
                        <p className="text-[10px] text-slate-500">{b.contact_phone}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          leftIcon={<FileText className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setSelectedBurial(b);
                            setIsPermitModalOpen(true);
                          }}
                        >
                          View Permit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredBurials.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No burial records found.
                </div>
              ) : (
                filteredBurials.map((b) => (
                  <div key={b.id} className="p-4 space-y-2.5 bg-white hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {b.permit_no || 'BP-PENDING'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Ref: {b.reference_no}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{b.deceased_name}</h4>
                      <p className="text-xs text-purple-900 font-semibold mt-0.5">
                        📍 {b.plot_code || 'Assigned Plot'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Death Date</span>
                        <strong>{new Date(b.date_of_death).toLocaleDateString()}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Interment Date</span>
                        <strong className="text-slate-900">{new Date(b.burial_date).toLocaleDateString()}</strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 text-[10px] block">Next of Kin</span>
                        <span>{b.contact_person} ({b.contact_phone})</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs font-bold justify-center"
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedBurial(b);
                          setIsPermitModalOpen(true);
                        }}
                      >
                        View Official Permit
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Quick Plot Status Manager */}
      <Modal
        isOpen={isManagePlotOpen}
        onClose={() => setIsManagePlotOpen(false)}
        title={`Manage Plot: ${selectedPlotToManage?.plot_code}`}
        description="Update plot operational status between Available, Reserved, and Occupied."
      >
        {selectedPlotToManage && (
          <div className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p><span className="font-bold text-slate-600">Cemetery:</span> {selectedPlotToManage.cemetery_name}</p>
              <p><span className="font-bold text-slate-600">Section / Type:</span> {selectedPlotToManage.section} ({selectedPlotToManage.plot_type})</p>
              <p><span className="font-bold text-slate-600">Location:</span> {selectedPlotToManage.block_no}, {selectedPlotToManage.lot_no}</p>
              <p><span className="font-bold text-slate-600">Standard Rate:</span> ₱{parseFloat(selectedPlotToManage.price.toString()).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Change Status to:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'Available', label: 'Available', desc: 'Ready for booking', color: 'emerald' },
                  { id: 'Reserved', label: 'Reserved', desc: 'Booked / Scheduled', color: 'amber' },
                  { id: 'Occupied', label: 'Occupied', desc: 'Deceased interred', color: 'slate' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setNewPlotStatus(st.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newPlotStatus === st.id
                        ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block">{st.label}</span>
                    <span className="text-[10px] text-slate-500">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100">
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setIsManagePlotOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 font-bold" onClick={handleSavePlotStatus}>
                Update Plot Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Batch Plot Expansion Generator */}
      <Modal
        isOpen={isBatchPlotsOpen}
        onClose={() => setIsBatchPlotsOpen(false)}
        title="Add Cemetery Plots / Expansion"
        description="Add multiple burial slots or niches to the municipal database."
      >
        <form onSubmit={handleCreateBatchPlots} className="space-y-3 text-xs max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Cemetery Facility Name *</label>
            <input
              type="text"
              required
              value={batchForm.cemetery_name}
              onChange={(e) => setBatchForm({ ...batchForm, cemetery_name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Section / Wing Name *"
              required
              value={batchForm.section}
              onChange={(e) => setBatchForm({ ...batchForm, section: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Plot Type</label>
              <select
                value={batchForm.plot_type}
                onChange={(e) => setBatchForm({ ...batchForm, plot_type: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Columbarium Niche">Columbarium Niche</option>
                <option value="Lawn Lot">Lawn Lot</option>
                <option value="Mausoleum">Mausoleum</option>
                <option value="Ossuary">Ossuary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Code Prefix *"
              required
              value={batchForm.prefix}
              onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value })}
            />
            <Input
              label="Number of Slots *"
              type="number"
              required
              value={batchForm.count}
              onChange={(e) => setBatchForm({ ...batchForm, count: e.target.value })}
            />
            <Input
              label="Rate per Slot (₱) *"
              type="number"
              required
              value={batchForm.price}
              onChange={(e) => setBatchForm({ ...batchForm, price: e.target.value })}
            />
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100">
            <Button size="sm" variant="outline" className="w-full sm:w-auto" type="button" onClick={() => setIsBatchPlotsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 font-bold" type="submit">
              Generate & Insert Slots
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Burial Permit Issuance */}
      <Modal
        isOpen={isNewBurialOpen}
        onClose={() => setIsNewBurialOpen(false)}
        title="Issue Burial & Interment Permit"
        description="Register deceased record and allocate cemetery lot."
      >
        <form onSubmit={handleCreateBurial} className="space-y-3 text-xs max-h-[80vh] overflow-y-auto pr-1">
          <Input
            label="Full Name of Deceased *"
            required
            placeholder="e.g. Juan Dela Cruz"
            value={newBurialForm.deceased_name}
            onChange={(e) => setNewBurialForm({ ...newBurialForm, deceased_name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date of Death *"
              type="date"
              required
              value={newBurialForm.date_of_death}
              onChange={(e) => setNewBurialForm({ ...newBurialForm, date_of_death: e.target.value })}
            />
            <Input
              label="Interment / Burial Date *"
              type="date"
              required
              value={newBurialForm.burial_date}
              onChange={(e) => setNewBurialForm({ ...newBurialForm, burial_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Select Available Plot / Niche *</label>
            <select
              value={newBurialForm.plot_id}
              onChange={(e) => setNewBurialForm({ ...newBurialForm, plot_id: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800"
            >
              {plots.filter(p => p.status === 'Available').map(p => (
                <option key={p.id} value={p.id}>{p.plot_code} - {p.section} ({p.lot_no})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Next of Kin Name *"
              required
              placeholder="e.g. Maria Dela Cruz (Daughter)"
              value={newBurialForm.contact_person}
              onChange={(e) => setNewBurialForm({ ...newBurialForm, contact_person: e.target.value })}
            />
            <Input
              label="Contact Phone *"
              required
              placeholder="+63 9XX XXX XXXX"
              value={newBurialForm.contact_phone}
              onChange={(e) => setNewBurialForm({ ...newBurialForm, contact_phone: e.target.value })}
            />
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100">
            <Button size="sm" variant="outline" className="w-full sm:w-auto" type="button" onClick={() => setIsNewBurialOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 font-bold" type="submit">
              Issue Official Permit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Official Permit Preview */}
      <Modal
        isOpen={isPermitModalOpen}
        onClose={() => setIsPermitModalOpen(false)}
        title="Official Municipal Burial Permit"
        maxWidth="xl"
      >
        {selectedBurial && (
          <div className="p-4 sm:p-6 bg-white border-2 border-slate-800 rounded-2xl space-y-4 text-center text-xs max-h-[80vh] overflow-y-auto">
            <div className="border-b border-slate-300 pb-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Republic of the Philippines</p>
              <h3 className="text-sm sm:text-base font-black font-display text-slate-900">MUNICIPAL CEMETERY & BURIAL SERVICES</h3>
              <p className="text-[11px] text-purple-700 font-bold">OFFICIAL PERMIT OF INTERMENT</p>
            </div>

            <div className="text-left space-y-2 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
              <p><span className="font-bold text-slate-500">Permit Number:</span> <strong className="font-mono text-purple-700">{selectedBurial.permit_no || 'BP-2026-0089'}</strong></p>
              <p><span className="font-bold text-slate-500">Deceased:</span> <strong className="text-slate-900">{selectedBurial.deceased_name}</strong></p>
              <p><span className="font-bold text-slate-500">Date of Death:</span> {new Date(selectedBurial.date_of_death).toLocaleDateString()}</p>
              <p><span className="font-bold text-slate-500">Interment Date:</span> <strong className="text-slate-900">{new Date(selectedBurial.burial_date).toLocaleDateString()}</strong></p>
              <p><span className="font-bold text-slate-500">Allocated Plot:</span> <strong className="font-mono text-purple-700">{selectedBurial.plot_code || 'Assigned Plot'}</strong></p>
              <p><span className="font-bold text-slate-500">Next of Kin:</span> {selectedBurial.contact_person} ({selectedBurial.contact_phone})</p>
            </div>

            <p className="text-[11px] text-slate-600 italic">
              Permission is hereby granted for the burial and interment of the aforementioned deceased in accordance with municipal sanitary regulations and health ordinances.
            </p>

            <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setIsPermitModalOpen(false)}>
                Close
              </Button>
              <Button size="sm" variant="primary" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 font-bold" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                Print Permit
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
