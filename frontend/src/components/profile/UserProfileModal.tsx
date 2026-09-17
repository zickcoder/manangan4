import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Copy, 
  Check, 
  FileText,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { updateUserPin, verifyUserPin } from '../../lib/api';
import { PinInput } from '../auth/PinInput';

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

  // PIN change state
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState('');
  const [pinError, setPinError] = useState('');

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

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinMsg('');

    const activeExpectedPin = user?.pin || '123456';
    if (!verifyUserPin(activeExpectedPin, currentPinInput)) {
      setPinError('Incorrect current PIN. (Default for accounts is 123456).');
      return;
    }

    if (newPinInput.length !== 6 || !/^\d{6}$/.test(newPinInput)) {
      setPinError('New PIN must be exactly 6 numeric digits.');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinError('New PIN and confirmation do not match.');
      return;
    }

    setPinLoading(true);
    try {
      const res = await updateUserPin(rawEmail, newPinInput);
      if (res.success) {
        setPinMsg('✅ Security PIN successfully updated!');
        setTimeout(() => {
          setIsChangingPin(false);
          setCurrentPinInput('');
          setNewPinInput('');
          setConfirmPinInput('');
          setPinMsg('');
        }, 1500);
      } else {
        setPinError(res.message || 'Failed to update PIN.');
      }
    } catch {
      setPinError('An error occurred while updating PIN.');
    } finally {
      setPinLoading(false);
    }
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

            {/* Security PIN Display & Update */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">6-Digit Security PIN</span>
                  <span className="font-mono font-bold text-slate-900 text-sm tracking-widest">••••••</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPin(!isChangingPin);
                      setPinError('');
                      setPinMsg('');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {isChangingPin ? 'Cancel' : 'Change PIN'}
                  </button>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Inline PIN Change Form */}
              {isChangingPin && (
                <form onSubmit={handleChangePinSubmit} className="pt-2 border-t border-slate-100 space-y-3">
                  {pinMsg && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{pinMsg}</span>
                    </div>
                  )}

                  {pinError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      {pinError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Current PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        required
                        value={currentPinInput}
                        onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full px-2.5 py-1.5 font-mono text-center text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">New 6-Digit PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        required
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full px-2.5 py-1.5 font-mono text-center text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Confirm PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        required
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full px-2.5 py-1.5 font-mono text-center text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={pinLoading || newPinInput.length !== 6 || confirmPinInput.length !== 6}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {pinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Update PIN</span>
                  </button>
                </form>
              )}
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
