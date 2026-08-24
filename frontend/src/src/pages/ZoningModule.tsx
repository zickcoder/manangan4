import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Eye, 
  Download, 
  Plus, 
  Sparkles,
  Printer
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchApplications, updateApplicationStatus, submitApplication } from '../lib/api';
import { Application } from '../types';

export function ZoningModule() {
  const [apps, setApps] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected for review/modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New application form
  const [newForm, setNewForm] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    project_title: '',
    location: '',
    zone_type: 'Commercial C-2',
    estimated_cost: '1000000',
    remarks: 'Submitted for Zoning Clearance Evaluation',
    priority: 'Normal',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchApplications('zoning', statusFilter);
      setApps(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedApp) return;
    try {
      await updateApplicationStatus(
        selectedApp.id,
        status,
        reviewRemarks || `Status updated to ${status}`,
        'Engr. Marcus Cruz'
      );
      setIsReviewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitApplication({
        ...newForm,
        type: 'zoning',
      });
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to create application');
    }
  };

  const filteredApps = apps.filter(a =>
    a.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <span>Zoning Clearance Administration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate land classification, setback compliance, and issue digital zoning clearances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewModalOpen(true)}
          >
            New Zoning Clearance
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ref, applicant, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Pending', 'Under Review', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'All Applications' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <Card className="border-[#cbd5e1]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Applicant & Title</th>
                  <th className="py-3 px-4">Zone Classification</th>
                  <th className="py-3 px-4">Est. Project Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No zoning applications found.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {app.reference_no}
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <p className="font-bold text-slate-800 truncate">{app.project_title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{app.applicant_name} • {app.location}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          {app.zone_type || 'Commercial C-2'}
                        </span>
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
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setReviewRemarks(app.remarks || '');
                            setIsReviewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors"
                          title="Review / Edit Status"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {app.status === 'Approved' && (
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setIsCertModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="View Official Certificate"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Evaluation & Disposition */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Review Application ${selectedApp?.reference_no}`}
        description="Verify land classification and submit formal board disposition."
      >
        {selectedApp && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p><span className="font-bold text-slate-700">Project:</span> {selectedApp.project_title}</p>
              <p><span className="font-bold text-slate-700">Applicant:</span> {selectedApp.applicant_name} ({selectedApp.applicant_email})</p>
              <p><span className="font-bold text-slate-700">Location:</span> {selectedApp.location}</p>
              <p><span className="font-bold text-slate-700">Zone Type:</span> {selectedApp.zone_type}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Technical Review Evaluation Remarks:
              </label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Specify setback compliance, height clearance, and parking slot notes..."
                className="w-full rounded-xl border border-[#cbd5e1] bg-white p-3 text-xs text-[#0f172a] focus:border-[#2563eb] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleUpdateStatus('Rejected')}
              >
                Reject Clearance
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus('Under Review')}
                >
                  Mark Under Review
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleUpdateStatus('Approved')}
                >
                  Grant Zoning Approval
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Official Clearance Certificate Preview */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        title="Official Zoning Clearance Certificate"
        maxWidth="2xl"
      >
        {selectedApp && (
          <div className="p-6 bg-white border-2 border-slate-800 rounded-2xl space-y-6 text-center text-xs">
            <div className="border-b border-slate-300 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Republic of the Philippines</p>
              <h3 className="text-lg font-black font-display text-slate-900 mt-0.5">LOCAL GOVERNMENT OF BARANGAY 178</h3>
              <p className="text-xs text-blue-700 font-semibold">City Planning and Development Office — Zoning Division</p>
            </div>

            <div>
              <h4 className="text-base font-black uppercase text-slate-900 tracking-wider underline">
                CERTIFICATE OF ZONING COMPLIANCE
              </h4>
              <p className="text-xs font-mono font-bold text-blue-600 mt-1">Control No: {selectedApp.reference_no}</p>
            </div>

            <p className="text-justify leading-relaxed text-slate-700">
              This is to certify that the proposed project titled <strong className="text-slate-900">"{selectedApp.project_title}"</strong> applied for by <strong className="text-slate-900">{selectedApp.applicant_name}</strong> located at <strong className="text-slate-900">{selectedApp.location}</strong> has been evaluated and found to conform with the Comprehensive Land Use Plan and Zoning Ordinance under classification <strong className="text-blue-700">{selectedApp.zone_type}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-6 text-left border-t border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Assessed Evaluation:</span>
                <span className="font-semibold text-slate-700">{selectedApp.remarks}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Certified Correct:</span>
                <p className="font-bold text-slate-900 mt-2">ENGR. MARCUS CRUZ</p>
                <p className="text-[10px] text-slate-500">Zoning Administrator</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Print Certificate
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add New Application */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Direct Staff Filing: Zoning Clearance"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateNew} className="space-y-3 text-xs">
          <Input
            label="Applicant Name / Entity *"
            required
            value={newForm.applicant_name}
            onChange={(e) => setNewForm({ ...newForm, applicant_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address *"
              type="email"
              required
              value={newForm.applicant_email}
              onChange={(e) => setNewForm({ ...newForm, applicant_email: e.target.value })}
            />
            <Input
              label="Contact Number *"
              required
              value={newForm.applicant_phone}
              onChange={(e) => setNewForm({ ...newForm, applicant_phone: e.target.value })}
            />
          </div>
          <Input
            label="Project Title *"
            required
            value={newForm.project_title}
            onChange={(e) => setNewForm({ ...newForm, project_title: e.target.value })}
          />
          <Input
            label="Property Location *"
            required
            value={newForm.location}
            onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Zone Type</label>
              <select
                value={newForm.zone_type}
                onChange={(e) => setNewForm({ ...newForm, zone_type: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Commercial C-1">Commercial C-1</option>
                <option value="Commercial C-2">Commercial C-2</option>
                <option value="Residential R-1">Residential R-1</option>
                <option value="Residential R-2">Residential R-2</option>
                <option value="Industrial I-1">Industrial I-1</option>
              </select>
            </div>
            <Input
              label="Estimated Cost (₱)"
              type="number"
              value={newForm.estimated_cost}
              onChange={(e) => setNewForm({ ...newForm, estimated_cost: e.target.value })}
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Submit Filing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
