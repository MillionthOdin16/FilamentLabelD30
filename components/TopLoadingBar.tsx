import React, { useEffect, useState } from 'react';

interface TopLoadingBarProps {
  isLoading: boolean;
}

const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ isLoading }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(10);
      const timer1 = setTimeout(() => setProgress(30), 100);
      const timer2 = setTimeout(() => setProgress(60), 300);
      const timer3 = setTimeout(() => setProgress(80), 600);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-1">
      <div
        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 ease-out shadow-lg shadow-cyan-500/50"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default TopLoadingBar;
