import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { fetchApplications, updateApplicationStatus } from '../lib/api';
import { Application } from '../types';

export function OccupancyModule() {
  const [apps, setApps] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

  const loadData = async () => {
    try {
      const data = await fetchApplications('occupancy', 'all');
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
        reviewRemarks || `Occupancy inspection finalized: ${status}`,
        'Engr. Marcus Cruz'
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
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-sm">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span>Occupancy Certificate Inspection & Issuance</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Post-construction physical verification, Bureau of Fire Protection (BFP) clearance, and occupancy safety certification.
          </p>
        </div>
      </div>

      {/* Occupancy Table */}
      <Card className="border-[#cbd5e1]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Inspection Code</th>
                  <th className="py-3 px-4">Building Facility</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">BFP Fire Clearance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Sign-Off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-600">
                      {app.reference_no}
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="font-bold text-slate-800 truncate">{app.project_title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{app.applicant_name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]">
                      {app.location}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                        {app.status === 'Approved' ? 'Verified Pass' : 'Pending Inspection'}
                      </span>
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
                        Final Inspection
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Final Sign-off */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Final Occupancy Inspection: ${selectedApp?.reference_no}`}
        description="Verify actual constructed site against approved blueprints."
      >
        {selectedApp && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800">{selectedApp.project_title}</h4>
              <p className="text-slate-600">{selectedApp.location}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Final Inspection Assessment Notes:
              </label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button size="sm" variant="danger" onClick={() => handleUpdateStatus('Rejected')}>
                Deny Occupancy
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('Under Review')}>
                  Hold for Re-inspection
                </Button>
                <Button size="sm" variant="success" onClick={() => handleUpdateStatus('Approved')}>
                  Issue Certificate of Occupancy
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
