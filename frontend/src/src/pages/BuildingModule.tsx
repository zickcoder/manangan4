import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  Building, 
  ShieldCheck,
  Printer
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { fetchApplications, updateApplicationStatus } from '../lib/api';
import { Application } from '../types';

export function BuildingModule() {
  const [apps, setApps] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Engineering Checkpoints
  const [checks, setChecks] = useState({
    architectural: true,
    structural: true,
    electrical: true,
    sanitary: true,
    setbacks: true,
    soilBoring: false,
  });

  const loadData = async () => {
    try {
      const data = await fetchApplications('building', 'all');
      setApps(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedApp) return;
    try {
      await updateApplicationStatus(
        selectedApp.id,
        status,
        reviewRemarks || `Engineering inspection verified: ${status}`,
        'Arch. Sofia Reyes'
      );
      setIsReviewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const filtered = apps.filter(a =>
    a.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.project_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <span>Building Review & Permit Official</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            National Building Code (PD 1096) plan inspections, structural verification, and permit stamping.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search building permits (e.g. APP-2026-0812)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white text-slate-800"
          />
        </div>
      </div>

      {/* Permits Table */}
      <Card className="border-[#cbd5e1]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Permit Code</th>
                  <th className="py-3 px-4">Structure Title</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Valuation (₱)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Engineering Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-600">
                      {app.reference_no}
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="font-bold text-slate-800 truncate">{app.project_title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{app.applicant_name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]">
                      {app.location}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      ₱{parseFloat(app.estimated_cost?.toString() || '0').toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          app.status === 'Approved' ? 'success' :
                          app.status === 'Under Review' ? 'warning' :
                          app.status === 'Rejected' ? 'destructive' : 'default'
                        }
                      >
                        {app.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedApp(app);
                          setReviewRemarks(app.remarks || '');
                          setIsReviewModalOpen(true);
                        }}
                      >
                        Inspect Plans
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Engineering Checklist & Stamp */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Building Permit Review: ${selectedApp?.reference_no}`}
        description="National Building Code Compliance Verification"
        maxWidth="xl"
      >
        {selectedApp && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800">{selectedApp.project_title}</h4>
              <p className="text-slate-600 mt-0.5">{selectedApp.location} • Applicant: {selectedApp.applicant_name}</p>
            </div>

            <div>
              <p className="font-bold text-slate-700 uppercase tracking-wider mb-2">Technical Inspection Checklist</p>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {[
                  { key: 'architectural', label: 'Architectural Blueprint Endorsed' },
                  { key: 'structural', label: 'Structural Calculations Verified' },
                  { key: 'electrical', label: 'Electrical & Fire Safety Clearance' },
                  { key: 'sanitary', label: 'Plumbing & Sanitary Approved' },
                  { key: 'setbacks', label: 'Boundary Setback Rules Compliant' },
                  { key: 'soilBoring', label: 'Soil Boring / Seismic Test Checked' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(checks as any)[item.key]}
                      onChange={(e) => setChecks({ ...checks, [item.key]: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-slate-700 font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Building Inspector Notes:</label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button size="sm" variant="danger" onClick={() => handleUpdateStatus('Rejected')}>
                Reject Permit
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('Under Review')}>
                  Flag for Corrections
                </Button>
                <Button size="sm" variant="success" onClick={() => handleUpdateStatus('Approved')}>
                  Issue Building Permit
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
