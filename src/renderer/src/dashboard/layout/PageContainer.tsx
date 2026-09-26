import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
}

/**
 * ROA Canonical Page Container
 * 
 * Main canvas wrapper:
 * - #F7F4EF warm ivory background
 * - Comfortable desktop padding (40px)
 * - Natural vertical scrolling
 * - No card-heavy wrappers
 */
export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <div className="flex-1 bg-roa-background overflow-auto">
      <div className="p-10 min-h-full">
        {children}
      </div>
    </div>
  );
};
