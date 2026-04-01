import { useMemo } from 'react';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';

export interface MissingField {
  key: string;
  label: string;
}

const MANDATORY_FIELDS: { key: string; label: string }[] = [
  { key: 'name', label: 'Nombre del despacho' },
  { key: 'contact_person', label: 'Nombre del abogado y apellidos' },
  { key: 'address', label: 'Dirección' },
  { key: 'cif', label: 'Datos fiscales (CIF)' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'contact_email', label: 'Email de contacto' },
];

export function useLawfirmProfileGate() {
  const { data: lawfirm, isLoading } = useLawfirmProfile();

  const missingFields = useMemo(() => {
    if (!lawfirm) return MANDATORY_FIELDS;

    return MANDATORY_FIELDS.filter(field => {
      const value = (lawfirm as any)[field.key];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
  }, [lawfirm]);

  const isProfileComplete = missingFields.length === 0;

  return {
    isProfileComplete,
    missingFields,
    isLoading,
    lawfirm,
  };
}
