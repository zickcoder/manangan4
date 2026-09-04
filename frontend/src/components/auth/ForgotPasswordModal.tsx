import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft 
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { Modal } from '../ui/Modal';
import { checkEmailExists, updateUserPassword } from '../../lib/api';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_6vsq3nj';
const EMAILJS_TEMPLATE_ID = 'template_dchi14k';
const EMAILJS_PUBLIC_KEY = '-3noUYuzaJc6YK0ej';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({ isOpen, onClose, defaultEmail = '' }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState(defaultEmail);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);

  // New Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Statuses
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleResetState = () => {
    setStep(1);
    setEmail('');
    setGeneratedOtp('');
    setUserOtpInput('');
    setOtpAttempts(0);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setSending(false);
    setLoading(false);
  };

  const handleClose = () => {
    handleResetState();
    onClose();
  };

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSending(true);

    try {
      const exists = await checkEmailExists(cleanEmail);
      if (!exists) {
        setError('⚠️ This email address is not registered in our system.');
        setSending(false);
        return;
      }

      // Generate random 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const templateParams = {
        to_email: cleanEmail,
        to_name: 'Account Holder',
        email: cleanEmail,
        name: 'Account Holder',
        otp_code: code,
        otp: code,
        code: code,
        passcode: code,
        verification_code: code,
        number: code,
        message: `Your GovServe Password Reset OTP code is ${code}.`,
        body: `Your GovServe Password Reset OTP code is ${code}.`,
      };

      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY
        );
      } catch (e) {
        console.warn('EmailJS SDK fallback:', e);
      }

      setGeneratedOtp(code);
      setOtpAttempts(0);
      setUserOtpInput('');
      setStep(2);
      setSuccessMsg(`📩 Password reset OTP sent to ${cleanEmail}! Please check your email inbox.`);
    } catch (err) {
      setError('Failed to send OTP email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Step 2: Verify OTP code (Max 3 attempts)
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (userOtpInput.trim() !== generatedOtp) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

      if (newAttempts >= 3) {
        setError('🔒 Maximum 3 OTP verification attempts reached. Returning to email step...');
        setOtpAttempts(0);
        setUserOtpInput('');
        setTimeout(() => {
          setStep(1);
          setError('');
        }, 1500);
        return;
      }

      setError(`🔒 Invalid OTP code. Attempt ${newAttempts} of 3.`);
      return;
    }

    setSuccessMsg('✅ OTP verified! Please set your new password.');
    setStep(3);
  };

  // Step 3: Update Password
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);

    try {
      const res = await updateUserPassword(email.trim(), newPassword);
      if (res.success) {
        setSuccessMsg('✅ Password reset successfully! You can now sign in with your new password.');
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(res.message || 'Failed to update password.');
      }
    } catch (err) {
      setError('An error occurred while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 1 
          ? 'Reset Your Account Password' 
          : step === 2 
          ? 'Enter 6-Digit Email OTP' 
          : 'Set New Password'
      }
      description={
        step === 1
          ? 'Enter your registered email address to receive an OTP verification code.'
          : step === 2
          ? `Enter the 6-digit code sent directly to ${email}.`
          : 'Choose a secure new password for your account.'
      }
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Alerts */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: EMAIL INPUT */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Account Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <span>Send Reset OTP →</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 font-semibold space-y-1">
              <p className="flex items-center gap-1.5 font-bold">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Verification Code Sent</span>
              </p>
              <p className="text-[11px] text-slate-600 font-normal">
                Attempt {otpAttempts} of 3 maximum attempts before returning to email input.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enter 6-Digit Email OTP *</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={userOtpInput}
                  onChange={(e) => setUserOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 849201"
                  className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 focus:bg-white text-slate-900 font-mono font-bold tracking-widest text-center"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                ← Back to Email
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
              >
                Verify OTP →
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {step === 3 && (
          <form onSubmit={handleSaveNewPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Saving Password...</span>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
