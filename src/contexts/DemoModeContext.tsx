import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type DataMode = 'real' | 'demo';

interface DemoModeContextType {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  isDemo: boolean;
  isReal: boolean;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

const STORAGE_KEY = 'asesor-legal-data-mode';

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DataMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored === 'demo' || stored === 'real') ? stored : 'real';
    }
    return 'real';
  });

  const setMode = (newMode: DataMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    // Force refresh all queries
    window.location.reload();
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <DemoModeContext.Provider value={{ 
      mode, 
      setMode, 
      isDemo: mode === 'demo',
      isReal: mode === 'real'
    }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}

// Helper for queries - returns the filter condition
export function getDemoFilter(isDemo: boolean): string {
  return isDemo ? 'is_demo.eq.true' : 'is_demo.is.null,is_demo.eq.false';
}
