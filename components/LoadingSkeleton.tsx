import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'button' | 'circle' | 'rect';
  count?: number;
  className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'text', 
  count = 1,
  className = '' 
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'h-32 rounded-2xl';
      case 'button':
        return 'h-12 rounded-xl';
      case 'circle':
        return 'w-12 h-12 rounded-full';
      case 'rect':
        return 'h-24 rounded-lg';
      case 'text':
      default:
        return 'h-4 rounded';
    }
  };

  return (
    <>
      {skeletons.map(i => (
        <div 
          key={i} 
          className={`bg-gray-800/50 skeleton ${getVariantClasses()} ${className}`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </>
  );
};

export default LoadingSkeleton;
