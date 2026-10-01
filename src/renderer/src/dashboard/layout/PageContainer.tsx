import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
}

/**
 * ROA Midnight Companion Page Container
 * 
 * Main canvas wrapper:
 * - #080A09 dark canvas background
 * - Comfortable desktop padding (32px)
 * - Natural vertical scrolling
 * - Typography-first, minimal card usage
 */
export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <div className="flex-1 bg-roa-canvas overflow-auto">
      <div className="p-roa-margin min-h-full">
        {children}
      </div>
    </div>
  );
};
