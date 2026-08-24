import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  User, 
  Bot,
  Mail
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { fetchInquiries, replyInquiry } from '../lib/api';
import { Inquiry } from '../types';

export function MessagesModule() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [staffReplyText, setStaffReplyText] = useState('');
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchInquiries();
      setInquiries(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReply = (inq: Inquiry) => {
    setSelectedInquiry(inq);
    setStaffReplyText(inq.ai_suggestion || inq.staff_reply || '');
    setIsReplyModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !staffReplyText.trim()) return;
    setReplyLoading(true);
    try {
      await replyInquiry(selectedInquiry.id, staffReplyText);
      setIsReplyModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span>Citizen Inquiries & Smart Ticket Desk</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review incoming public questions, generate AI response drafts, and issue official verified resolutions.
          </p>
        </div>
      </div>

      {/* Inquiries Feed */}
      <div className="space-y-4">
        {inquiries.map((inq) => (
          <Card key={inq.id} hoverEffect className="border-[#cbd5e1] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {inq.ticket_no}
                </span>
                <span className="text-xs font-semibold text-slate-500">Department:</span>
                <Badge variant="info">{inq.department}</Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">
                  {new Date(inq.created_at).toLocaleDateString()} at {new Date(inq.created_at).toLocaleTimeString()}
                </span>
                <Badge variant={inq.status === 'Resolved' ? 'success' : 'warning'}>
                  {inq.status}
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{inq.subject}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{inq.message}"
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <User className="w-3.5 h-3.5" />
                <span>Citizen: <strong className="text-slate-700">{inq.citizen_name}</strong> ({inq.citizen_email})</span>
              </div>
            </div>

            {/* AI Suggestion Preview */}
            {inq.ai_suggestion && (
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>OpenRouter AI Auto-Draft Suggestion:</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">{inq.ai_suggestion}</p>
              </div>
            )}

            {/* Staff Reply if already sent */}
            {inq.staff_reply && (
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Official Government Resolution:</span>
                </div>
                <p className="text-slate-700 text-[11px]">{inq.staff_reply}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant={inq.status === 'Resolved' ? 'secondary' : 'primary'}
                leftIcon={inq.status === 'Resolved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                onClick={() => handleOpenReply(inq)}
              >
                {inq.status === 'Resolved' ? 'Edit Resolution' : 'Review & Send AI Resolution'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Reply Editor */}
      <Modal
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        title={`Respond to Ticket: ${selectedInquiry?.ticket_no}`}
        description="Draft and dispatch official resolution to citizen email."
        maxWidth="xl"
      >
        {selectedInquiry && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800">{selectedInquiry.subject}</p>
              <p className="text-slate-600 mt-0.5">From: {selectedInquiry.citizen_name} ({selectedInquiry.citizen_email})</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[#334155]">Official Response Letter:</label>
                {selectedInquiry.ai_suggestion && (
                  <button
                    type="button"
                    onClick={() => setStaffReplyText(selectedInquiry.ai_suggestion || '')}
                    className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Restore AI Draft</span>
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={staffReplyText}
                onChange={(e) => setStaffReplyText(e.target.value)}
                placeholder="Type official municipal response..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setIsReplyModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" isLoading={replyLoading} onClick={handleSendReply}>
                Dispatch Official Reply
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
