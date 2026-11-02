"use client";

import { createContext, useCallback, useContext, useRef, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useThaanaKeyboard } from "@/hooks/use-thaana-keyboard";
import { Button } from "@/components/ui/button";
import { KeyboardIcon } from "lucide-react";

const STORAGE_KEY = "ff_thaana_input";

/* ---------- preference, shared across every field ---------- */

const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

// Server snapshot matches the default, so hydration never mismatches.
const serverEnabled = () => true;

export function useThaanaEnabled() {
  const enabled = useSyncExternalStore(subscribe, readEnabled, serverEnabled);
  const setEnabled = useCallback((next: boolean) => {
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    listeners.forEach((fn) => fn());
  }, []);
  return [enabled, setEnabled] as const;
}

/**
 * Lets a subtree force the keyboard off regardless of the preference — used to
 * wrap Arabic fields, where phonetic Thaana mapping would be wrong.
 */
const ThaanaAllowed = createContext(true);

export function NoThaana({ children }: { children: React.ReactNode }) {
  return <ThaanaAllowed.Provider value={false}>{children}</ThaanaAllowed.Provider>;
}

function useActive() {
  const [enabled] = useThaanaEnabled();
  return useContext(ThaanaAllowed) && enabled;
}

/* ---------- fields ---------- */

type TextareaProps = Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "onChange" | "ref"
> & {
  value: string;
  onValueChange: (next: string) => void;
};

/** Textarea with phonetic Thaana input. For Dhivehi copy only. */
export function ThaanaTextarea({ value, onValueChange, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { onKeyDown } = useThaanaKeyboard({
    enabled: useActive(),
    value,
    setValue: onValueChange,
    textareaRef: ref,
  });

  return (
    <Textarea
      {...props}
      ref={ref}
      dir="rtl"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

type InputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "ref"
> & {
  value: string;
  onValueChange: (next: string) => void;
};

/** Input with phonetic Thaana input. For Dhivehi copy only. */
export function ThaanaInput({ value, onValueChange, ...props }: InputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const { onKeyDown } = useThaanaKeyboard({
    enabled: useActive(),
    value,
    setValue: onValueChange,
    textareaRef: ref,
  });

  return (
    <Input
      {...props}
      ref={ref}
      dir="rtl"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

/** On/off switch for the phonetic keyboard. */
export function ThaanaToggle({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useThaanaEnabled();
  return (
    <Button
      type="button"
      variant={enabled ? "default" : "outline"}
      size="sm"
      aria-pressed={enabled}
      onClick={() => setEnabled(!enabled)}
      title={enabled ? "ތާނަ ކީބޯޑު ބަންދުކުރައްވާ" : "ތާނަ ކީބޯޑު ހުޅުއްވާ"}
      className={`flex-none ${className}`}
    >
      <KeyboardIcon />
      <span className="hidden lg:inline">ތާނަ</span>
    </Button>
  );
}
