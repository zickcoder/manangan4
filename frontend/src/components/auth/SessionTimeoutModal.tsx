import React from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutModalProps) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Disallow clicking outside without choosing
      title="Session Expiration Notice"
      description="Inactivity security protection"
      maxWidth="sm"
    >
      <div className="space-y-5 text-center py-2">
        {/* Warning Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-inner">
          <Clock className="w-8 h-8 animate-pulse text-amber-600" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h4 className="text-base font-bold text-slate-900">
            Are you still working?
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
            Your session has been idle for nearly 30 minutes. To protect your account security, you will be logged out in:
          </p>
          <div className="inline-block px-4 py-1.5 bg-amber-100/70 border border-amber-300 rounded-full font-mono font-extrabold text-amber-800 text-lg tracking-wider">
            {timeFormatted}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={onStayLoggedIn}
            className="flex-1 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            Stay Logged In
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            className="py-2.5 flex items-center justify-center gap-2 font-medium text-slate-600 hover:text-red-600 border-slate-300"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}
