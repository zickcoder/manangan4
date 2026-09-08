import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Copy, 
  Check, 
  FileText
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

/** Always masks email keeping first and last characters: e.g. ju***uz@citizen.gov.ph */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '******@citizen.gov.ph';
  const [local, domain] = email.split('@');
  let maskedLocal = '';
  if (local.length <= 2) {
    maskedLocal = local[0] + '*';
  } else if (local.length <= 4) {
    maskedLocal = local[0] + '**' + local[local.length - 1];
  } else {
    const start = local.slice(0, 2);
    const end = local.slice(-2);
    maskedLocal = `${start}${'*'.repeat(Math.max(3, local.length - 4))}${end}`;
  }
  return `${maskedLocal}@${domain}`;
}

export function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const navigate = useNavigate();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isCitizen = user?.role === 'Citizen';
  const rawEmail = user?.email || (isCitizen ? 'juan.delacruz@citizen.gov.ph' : 'admin@lgu.gov.ph');
  const maskedEmail = maskEmail(rawEmail);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(maskedEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Profile"
      description="Account information and citizen credentials."
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Profile Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700/60 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md ring-2 ring-blue-400/30 shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-extrabold text-white">
                  {user?.name || (isCitizen ? 'Juan M. Dela Cruz' : 'Administrator')}
                </h3>
                <p className="text-xs text-slate-300 font-mono">
                  Account ID: <strong>CZ-2026-{user?.id || '101'}</strong>
                </p>
              </div>
            </div>

            <Badge variant={isCitizen ? 'info' : 'purple'} className="py-1 px-3 text-xs font-bold shrink-0">
              {isCitizen ? 'Citizen' : 'Admin'}
            </Badge>
          </div>
        </div>

        {/* Profile Information List */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-slate-800">
          <div className="space-y-2.5 text-xs">
            {/* Full Name */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{user?.name || (isCitizen ? 'Juan M. Dela Cruz' : 'Administrator')}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <User className="w-4 h-4" />
              </div>
            </div>

            {/* Email Address - Always Masked */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Email Address</span>
                <span className="font-mono font-bold text-slate-800 text-sm select-all">{maskedEmail}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Copy Masked Email"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Contact Phone</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{user?.phone || '+63 917 123 4567'}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
            </div>

            {/* Role & Access */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Account Role</span>
                <span className="font-bold text-slate-900 text-sm">{isCitizen ? 'Registered Citizen' : 'System Administrator'}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          {isCitizen ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => {
                onClose();
                navigate('/my-tickets');
              }}
            >
              My Tickets
            </Button>
          ) : <div />}

          <Button
            size="sm"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
