'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

// Six single-digit boxes that behave like one field: typing advances, backspace retreats,
// pasting or SMS autofill (autocomplete="one-time-code" on the first box) fills them all.
export function OtpInput({
  value,
  onChange,
  length = 6,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function focus(i: number) {
    refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  }

  function setFrom(i: number, raw: string) {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return;
    const next = (value.slice(0, i) + clean).slice(0, length);
    onChange(next);
    focus(next.length >= length ? length - 1 : next.length);
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) onChange(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const clean = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (clean) {
      onChange(clean);
      focus(clean.length >= length ? length - 1 : clean.length);
    }
  }

  return (
    <div className={`flex gap-2 sm:gap-2.5 ${invalid ? 'animate-shake' : ''}`} role="group" aria-label="One-time code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          onChange={(e) => setFrom(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? length : 1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          className={`h-14 w-full min-w-0 rounded-xl border bg-sand-2 text-center font-mono text-2xl font-medium text-ink outline-none transition-[border-color,box-shadow,transform] duration-200 focus:-translate-y-0.5 focus:border-ink focus:shadow-[0_0_0_4px_rgba(200,255,61,0.55)] disabled:opacity-50 sm:h-16 ${
            invalid ? 'border-error' : d ? 'border-ink' : 'border-sand-4'
          }`}
        />
      ))}
    </div>
  );
}
