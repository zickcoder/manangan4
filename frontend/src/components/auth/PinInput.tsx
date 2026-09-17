import React, { useRef, useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  label?: string;
  showKeypad?: boolean;
}

export function PinInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  error = false,
  label = 'Enter 6-Digit Security PIN',
  showKeypad = true,
}: PinInputProps) {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleDigitChange = (index: number, digit: string) => {
    if (disabled) return;
    const cleanDigit = digit.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const newPin = newDigits.join('').slice(0, 6);
    onChange(newPin);

    // Auto-advance
    if (cleanDigit && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.length === 6 && onComplete) {
      onComplete(newPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextIdx = Math.min(pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
      if (pasted.length === 6 && onComplete) {
        onComplete(pasted);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-3">
      {label && (
        <div className="flex items-center justify-between w-full max-w-sm px-1">
          <label className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPin ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Mask PIN</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show PIN</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 6 Discrete Digit Inputs */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full max-w-sm">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-extrabold rounded-xl border-2 transition-all outline-none shadow-sm ${
              error
                ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : digit
                ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-blue-100'
                : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

