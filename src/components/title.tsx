import { cn } from '@/lib/utils';
import React from 'react';

interface TitleProps {
  children: React.ReactNode;
  className?: string;
}

const Title: React.FC<TitleProps> = ({ children, className }) => {
  return (
    <h1 className={cn("text-xl text-primary font-bold mb-6 after:content-[''] after:mt-4 after:block after:w-9 after:h-1 after:bg-primary-light", className)}>
      {children}
    </h1>
  );
};

export default Title;
