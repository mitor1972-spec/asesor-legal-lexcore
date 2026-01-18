import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Search, User, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { search, results, isSearching } = useGlobalSearch();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].link);
      onOpenChange(false);
    }
  }, [results, selectedIndex, navigate, onOpenChange]);

  const handleSelect = (link: string) => {
    navigate(link);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Búsqueda global</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar leads, despachos..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {query.length >= 2 && (
          <div className="max-h-[300px] overflow-y-auto py-2">
            {results.length === 0 && !isSearching ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                No se encontraron resultados
              </p>
            ) : (
              <>
                {results.filter(r => r.type === 'lead').length > 0 && (
                  <div className="px-2 py-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-1">LEADS</p>
                    {results.filter(r => r.type === 'lead').map((result, idx) => {
                      const globalIdx = results.findIndex(r => r.id === result.id);
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result.link)}
                          className={cn(
                            'w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors',
                            selectedIndex === globalIdx ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {results.filter(r => r.type === 'lawfirm').length > 0 && (
                  <div className="px-2 py-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-1">DESPACHOS</p>
                    {results.filter(r => r.type === 'lawfirm').map((result) => {
                      const globalIdx = results.findIndex(r => r.id === result.id);
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result.link)}
                          className={cn(
                            'w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors',
                            selectedIndex === globalIdx ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>↑↓ para navegar</span>
          <span>↵ para seleccionar</span>
          <span>esc para cerrar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
