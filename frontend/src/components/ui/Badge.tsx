import React from 'react';

type BadgeVariant =
  | 'apto'
  | 'no_apto'
  | 'regular'
  | 'estandar'
  | 'subestandar'
  | 'bueno'
  | 'malo'
  | 'na'
  | 'revision'
  | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const styles: Record<BadgeVariant, string> = {
  apto:       'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  estandar:   'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  bueno:      'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  no_apto:    'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]',
  subestandar:'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]',
  malo:       'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]',
  regular:    'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
  revision:   'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  na:         'bg-[#F9FAFB] text-[#374151] border-[#E5E7EB]',
  neutral:    'bg-[#F9FAFB] text-[#374151] border-[#E5E7EB]',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children }) => {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5',
        'rounded text-xs font-medium border',
        styles[variant] ?? styles.neutral,
      ].join(' ')}
    >
      {children}
    </span>
  );
};
