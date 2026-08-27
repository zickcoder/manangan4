import React, { useState } from 'react';
import { 
  Cross, 
  CheckCircle2, 
  MapPin, 
  Sparkles, 
  X, 
  Building2, 
  Layers, 
  Info,
  Maximize2
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CemeteryPlot } from '../../types';

interface InteractivePlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  plots: CemeteryPlot[];
  selectedPlotId?: number;
  onSelectPlot: (plot: CemeteryPlot) => void;
  title?: string;
  isStaff?: boolean;
}

export function InteractivePlotModal({
  isOpen,
  onClose,
  plots,
  selectedPlotId,
  onSelectPlot,
  title = 'Interactive Cemetery Plot & Columbarium Wall Map',
  isStaff = false
}: InteractivePlotModalProps) {
  const [activeTab, setActiveTab] = useState<'columbarium' | 'lawn'>('columbarium');
  const [hoveredPlot, setHoveredPlot] = useState<CemeteryPlot | null>(null);
  const [activePlot, setActivePlot] = useState<CemeteryPlot | null>(
    plots.find(p => p.id === selectedPlotId) || null
  );

  if (!isOpen) return null;

  // Filter columbarium niches (Row 1-8, Col 1-12) vs Lawn Lots
  const columbariumNiches = plots.filter(p => p.plot_type === 'Columbarium Niche' || p.plot_code.startsWith('COL-'));
  const lawnLots = plots.filter(p => p.plot_type !== 'Columbarium Niche' && !p.plot_code.startsWith('COL-'));

  const handleCellClick = (plot: CemeteryPlot) => {
    if (plot.status !== 'Available') return;
    setActivePlot(plot);
  };

  const handleConfirmSelection = () => {
    if (activePlot) {
      onSelectPlot(activePlot);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between border-b border-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/40 text-purple-300 border border-purple-400/30">
              <Cross className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display text-white">{title}</h3>
                <Badge variant="purple" className="text-[10px]">Realistic Marble Grid</Badge>
              </div>
              <p className="text-xs text-purple-200/80">Click any vault box directly on the marble wall image to select.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher & Legend Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex gap-2">
            <span className="px-3 py-1.5 rounded-xl font-bold bg-purple-700 text-white shadow-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Municipal Burial Niche Grid (80 Niche Plots)</span>
            </span>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Reserved</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
              <span>Occupied (✝)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-400"></span>
              <span className="font-bold text-blue-700">Selected</span>
            </span>
          </div>
        </div>

        {/* Modal Body: Interactive Visual Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
          {activeTab === 'columbarium' ? (
            <div className="space-y-4">
              {/* Columbarium Wall Container with Transparent Interactive Grid */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-slate-500 shadow-xl bg-slate-900 mx-auto max-w-4xl">
                {/* Bold-Frame Columbarium Wall Image */}
                <img
                  src="/columbarium-wall.jpg"
                  alt="Columbarium Marble Wall"
                  className="w-full h-auto object-cover block select-none"
                  draggable={false}
                />

                {/* 
                  PRECISE GRID CALIBRATION (New 8 rows x 10 cols image):
                  Image dimensions: 1024 x 764px
                  - Top concrete frame: 36px / 764px = 4.71%
                  - Bottom concrete frame: 24px / 764px = 3.14%
                  - Left concrete frame: 37px / 1024px = 3.61%
                  - Right concrete frame: 38px / 1024px = 3.71%
                  Grid covers exactly 8 rows × 10 columns of marble tiles.
                */}
                <div 
                  className="absolute grid grid-rows-8 grid-cols-10"
                  style={{
                    top: '4.71%',
                    bottom: '3.14%',
                    left: '3.61%',
                    right: '3.71%',
                    gap: '0px',
                  }}
                >
                  {Array.from({ length: 8 }, (_, rIdx) => {
                    const rowNum = rIdx + 1;
                    return Array.from({ length: 10 }, (_, cIdx) => {
                      const colNum = cIdx + 1;
                      const rowStr = rowNum < 10 ? `R0${rowNum}` : `R${rowNum}`;
                      const colStr = colNum < 10 ? `C0${colNum}` : `C${colNum}`;
                      const targetCode = `COL-${rowStr}-${colStr}`;

                      const plotObj = columbariumNiches.find(
                        p => p.plot_code === targetCode || (p.row_no === rowNum && p.col_no === colNum)
                      ) || {
                        id: rowNum * 100 + colNum,
                        plot_code: targetCode,
                        section: 'Columbarium Wall Alpha',
                        block_no: `Row ${rowNum}`,
                        lot_no: `Vault ${colNum}`,
                        plot_type: 'Columbarium Niche',
                        status: 'Available',
                        price: 18000
                      } as CemeteryPlot;

                      const isSelected = activePlot?.plot_code === plotObj.plot_code;
                      const isOccupied = plotObj.status === 'Occupied';
                      const isReserved = plotObj.status === 'Reserved';

                      return (
                        <button
                          key={`${rowNum}-${colNum}`}
                          type="button"
                          disabled={isOccupied || isReserved}
                          onClick={() => handleCellClick(plotObj)}
                          onMouseEnter={() => setHoveredPlot(plotObj)}
                          onMouseLeave={() => setHoveredPlot(null)}
                          className={`group relative transition-all duration-150 flex flex-col items-center justify-center font-mono ${
                            isSelected
                              ? 'bg-blue-500/30 outline outline-2 outline-blue-600 z-20 shadow-md'
                              : isOccupied
                              ? 'bg-slate-900/60 cursor-not-allowed opacity-90'
                              : isReserved
                              ? 'bg-amber-500/40 cursor-not-allowed ring-1 ring-amber-600/50'
                              : 'bg-transparent hover:bg-white/30 cursor-pointer'
                          }`}
                          title={`${plotObj.plot_code} • ${plotObj.status}${isReserved ? ' (Reserved - Pending Interment)' : ''}${plotObj.deceased_name ? ' • Deceased: ' + plotObj.deceased_name : ''}`}
                        >
                          {/* Clean minimalist coordinate text directly inside the marble square */}
                          <span 
                            className={`text-[8px] sm:text-[10px] font-extrabold tracking-tight leading-none ${
                              isSelected
                                ? 'text-blue-900 bg-white/90 px-1 py-0.5 rounded shadow-sm'
                                : isOccupied
                                ? 'text-white/80 font-bold'
                                : isReserved
                                ? 'text-amber-900 font-bold'
                                : 'text-slate-800/80 font-bold'
                            }`}
                          >
                            {isOccupied ? '✝' : `${rowNum}-${colNum}`}
                          </span>

                          {/* Status indicator dot */}
                          {!isOccupied && (
                            <span 
                              className={`w-1 h-1 rounded-full mt-0.5 ${
                                isSelected ? 'bg-blue-600' : isReserved ? 'bg-amber-500' : 'bg-emerald-600/70'
                              }`}
                            />
                          )}
                        </button>
                      );
                    });
                  })}
                </div>
              </div>


              {/* Hover / Active Plot Details Card */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-500">Selected Niche:</span>
                    {activePlot ? (
                      <span className="font-mono text-base font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                        {activePlot.plot_code}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Click on any vault box in the marble wall above</span>
                    )}
                    {activePlot && (
                      <Badge variant={activePlot.status === 'Available' ? 'success' : activePlot.status === 'Reserved' ? 'warning' : 'default'}>
                        {activePlot.status}
                      </Badge>
                    )}
                  </div>
                  {activePlot && (
                    <div className="space-y-1">
                      <p className="text-slate-600">
                        {activePlot.section} • {activePlot.block_no}, {activePlot.lot_no} • Fee: ₱{parseFloat(activePlot.price.toString()).toLocaleString()}
                      </p>
                      {activePlot.deceased_name ? (
                        <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 font-medium">
                          <p className="font-bold text-xs flex items-center gap-1.5 text-purple-900">
                            <span>🕊️ Deceased Interred:</span>
                            <span className="underline decoration-purple-400 font-extrabold text-sm">{activePlot.deceased_name}</span>
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-purple-800 mt-1">
                            {activePlot.burial_date && <span><strong>Burial Date:</strong> {new Date(activePlot.burial_date).toLocaleDateString()}</span>}
                            {activePlot.permit_no && <span><strong>Permit No:</strong> {activePlot.permit_no}</span>}
                            {activePlot.contact_person && <span><strong>Next of Kin:</strong> {activePlot.contact_person}</span>}
                          </div>
                        </div>
                      ) : activePlot.status === 'Occupied' ? (
                        <p className="text-[11px] text-slate-500 italic">
                          Vault is occupied (Historical registry record).
                        </p>
                      ) : activePlot.status === 'Reserved' ? (
                        <p className="text-[11px] text-amber-700 font-semibold">
                          🟡 Vault is reserved for an upcoming scheduled burial service.
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          🟢 Vault is open and ready for immediate reservation.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-purple-600 hover:bg-purple-700 font-bold text-white shadow-sm"
                    disabled={!activePlot || (activePlot.status === 'Occupied' && !isStaff)}
                    onClick={handleConfirmSelection}
                  >
                    Confirm & Select this Niche
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Lawn Lots & Mausoleums View */
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {lawnLots.map((plot) => {
                  const isSelected = activePlot?.id === plot.id;
                  const isOccupied = plot.status === 'Occupied';
                  return (
                    <div
                      key={plot.id}
                      onClick={() => handleCellClick(plot)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-white ring-4 ring-blue-400 shadow-lg'
                          : isOccupied
                          ? 'bg-slate-100 border-slate-300 text-slate-700'
                          : plot.status === 'Reserved'
                          ? 'bg-amber-50 border-amber-300 text-slate-800'
                          : 'bg-white border-slate-200 hover:border-purple-400 hover:shadow-soft text-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`font-mono text-xs font-bold ${isSelected ? 'text-white' : 'text-purple-700'}`}>
                          {plot.plot_code}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {plot.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold mt-2 truncate">{plot.lot_no}</h4>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {plot.section}
                      </p>
                      {plot.deceased_name && (
                        <p className={`text-[11px] font-extrabold mt-1 truncate ${isSelected ? 'text-amber-200' : 'text-purple-900'}`}>
                          🕊️ {plot.deceased_name}
                        </p>
                      )}
                      <p className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        ₱{parseFloat(plot.price.toString()).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Selection Footer */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Selected Plot:</span>
                  <span className="font-mono text-sm font-extrabold text-purple-700 ml-2">
                    {activePlot?.plot_code || 'None selected'}
                  </span>
                  {activePlot?.deceased_name && (
                    <span className="ml-3 text-purple-900 font-bold">
                      🕊️ Deceased: {activePlot.deceased_name}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="bg-purple-600 hover:bg-purple-700 font-bold text-white"
                    disabled={!activePlot || (activePlot.status === 'Occupied' && !isStaff)}
                    onClick={handleConfirmSelection}
                  >
                    Confirm Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
