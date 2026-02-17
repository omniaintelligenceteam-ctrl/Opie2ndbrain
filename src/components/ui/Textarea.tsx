'use client';

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export default function Textarea({ style, ...props }: TextareaProps) {
  return (
    <textarea
      style={{
        width: '100%',
        minHeight: 100,
        padding: '12px 16px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(15, 15, 26, 0.8)',
        color: '#fff',
        fontSize: '0.9rem',
        lineHeight: 1.5,
        resize: 'vertical',
        outline: 'none',
        ...style,
      }}
      {...props}
    />
  );
}
