import { useRef, type MutableRefObject } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  firstInputRef?: MutableRefObject<HTMLInputElement | null>;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export default function OtpInput({
  value,
  onChange,
  length = 6,
  firstInputRef,
  disabled = false,
  className = "",
  inputClassName = "",
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusInput = (index: number) => {
    const target = inputRefs.current[Math.max(0, Math.min(index, length - 1))];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const updateAtIndex = (index: number, nextDigit: string) => {
    const next = value.split("");
    next[index] = nextDigit;
    onChange(next.join("").slice(0, length));
  };

  const removeAtIndex = (index: number) => {
    const next = value.split("");
    next.splice(index, 1);
    onChange(next.join("").slice(0, length));
  };

  const handleChange = (index: number, rawValue: string) => {
    const numericValue = rawValue.replace(/\D/g, "");

    if (!numericValue) {
      removeAtIndex(index);
      return;
    }

    if (numericValue.length === 1) {
      updateAtIndex(index, numericValue);
      if (index < length - 1) {
        requestAnimationFrame(() => focusInput(index + 1));
      }
      return;
    }

    const next = value.split("");
    numericValue.slice(0, length - index).split("").forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    onChange(next.join("").slice(0, length));
    requestAnimationFrame(() => focusInput(Math.min(index + numericValue.length - 1, length - 1)));
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      if (digits[index]) {
        removeAtIndex(index);
        requestAnimationFrame(() => focusInput(index));
        return;
      }

      if (index > 0) {
        removeAtIndex(index - 1);
        requestAnimationFrame(() => focusInput(index - 1));
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    requestAnimationFrame(() => focusInput(Math.min(pasted.length, length - 1)));
  };

  return (
    <div className={className}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
            if (index === 0 && firstInputRef) {
              firstInputRef.current = node;
            }
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digits[index]}
          disabled={disabled}
          className={inputClassName}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
