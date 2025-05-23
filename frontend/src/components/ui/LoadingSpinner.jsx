import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-10 w-10 border-2',
    xl: 'h-12 w-12 border-4',
  };

  return (
    <div className={`inline-block ${sizeClasses[size] || sizeClasses.md} ${className}`}>
      <div 
        className="animate-spin rounded-full border-t-2 border-b-2 border-indigo-500 w-full h-full"
        role="status"
      >
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
