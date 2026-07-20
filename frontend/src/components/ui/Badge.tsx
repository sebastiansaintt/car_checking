import React from 'react';

interface BadgeProps {
  variant?: 'apto' | 'no_apto' | 'bueno' | 'regular' | 'malo' | 'neutral';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children }) => {
  const styles = {
    apto: 'bg-status-apto-bg text-status-apto-text border-status-apto-border',
    bueno: 'bg-status-apto-bg text-status-apto-text border-status-apto-border',
    no_apto: 'bg-status-no_apto-bg text-status-no_apto-text border-status-no_apto-border',
    malo: 'bg-status-no_apto-bg text-status-no_apto-text border-status-no_apto-border',
    regular: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    neutral: 'bg-gray-100 text-secondary-text border-border'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};
