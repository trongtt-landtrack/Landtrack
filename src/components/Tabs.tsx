import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-primary/60 hover:text-primary hover:border-accent/50',
              'whitespace-nowrap py-4 px-1 border-b-2 font-display font-bold text-sm flex items-center gap-2'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.icon && <span className={activeTab === tab.id ? "text-accent" : "text-primary/40"}>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
