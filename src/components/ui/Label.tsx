'use client';

import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export default function Label({ children, style, ...props }: LabelProps) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        marginBottom: 8,
        cursor: 'pointer',
        ...style,
      }}
      {...props}
    >
      {children}
    </label>
  );
}
