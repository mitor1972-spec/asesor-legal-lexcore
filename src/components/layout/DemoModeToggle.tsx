import { useDemoMode, type DataMode } from '@/contexts/DemoModeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Database, FlaskConical, ChevronDown } from 'lucide-react';

export function DemoModeToggle() {
  const { mode, setMode } = useDemoMode();

  const handleModeChange = (newMode: DataMode) => {
    if (newMode !== mode) {
      setMode(newMode);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 h-9"
        >
          {mode === 'demo' ? (
            <>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-0 px-2 py-0.5">
                <FlaskConical className="h-3 w-3 mr-1" />
                DEMO
              </Badge>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 px-2 py-0.5">
                <Database className="h-3 w-3 mr-1" />
                REAL
              </Badge>
            </>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleModeChange('real')}
          className={mode === 'real' ? 'bg-accent' : ''}
        >
          <Database className="h-4 w-4 mr-2 text-emerald-600" />
          <span className="flex-1">Modo REAL</span>
          {mode === 'real' && <span className="text-emerald-600">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleModeChange('demo')}
          className={mode === 'demo' ? 'bg-accent' : ''}
        >
          <FlaskConical className="h-4 w-4 mr-2 text-purple-600" />
          <span className="flex-1">Modo DEMO</span>
          {mode === 'demo' && <span className="text-purple-600">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact badge for showing current mode
export function DemoModeBadge() {
  const { mode } = useDemoMode();

  if (mode === 'demo') {
    return (
      <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-0 animate-pulse">
        <FlaskConical className="h-3 w-3 mr-1" />
        DEMO
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
      <Database className="h-3 w-3 mr-1" />
      REAL
    </Badge>
  );
}
