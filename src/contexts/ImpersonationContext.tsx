import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Lawfirm } from '@/hooks/useLawfirms';

interface ImpersonationContextType {
  impersonatedLawfirm: Lawfirm | null;
  isImpersonating: boolean;
  startImpersonation: (lawfirm: Lawfirm) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedLawfirm, setImpersonatedLawfirm] = useState<Lawfirm | null>(null);

  const startImpersonation = useCallback((lawfirm: Lawfirm) => {
    setImpersonatedLawfirm(lawfirm);
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedLawfirm(null);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedLawfirm,
        isImpersonating: !!impersonatedLawfirm,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
