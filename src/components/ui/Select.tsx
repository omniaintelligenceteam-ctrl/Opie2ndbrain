'use client';

import React, { createContext, useContext, useState } from 'react';

interface SelectContextType {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | null>(null);

interface SelectProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}

export function Select({ children, value, onValueChange }: SelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onChange: onValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be inside Select');

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(15, 15, 26, 0.8)',
        color: '#fff',
        fontSize: '0.9rem',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be inside Select');

  return <span>{context.value || placeholder || 'Select...'}</span>;
}

export function SelectContent({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be inside Select');

  if (!context.open) return null;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        padding: '8px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(15, 15, 26, 0.95)',
        zIndex: 100,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SelectItem({ children, value, className, style }: { children: React.ReactNode; value: string; className?: string; style?: React.CSSProperties }) {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be inside Select');

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      onClick={() => {
        context.onChange(value);
        context.setOpen(false);
      }}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '8px 12px',
        borderRadius: 6,
        border: 'none',
        background: isSelected ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
        color: isSelected ? '#667eea' : 'rgba(255,255,255,0.8)',
        fontSize: '0.85rem',
        textAlign: 'left',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default Select;
