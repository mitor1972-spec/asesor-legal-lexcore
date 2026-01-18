import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function NewLeadButton() {
  return (
    <Button asChild className="gradient-brand">
      <Link to="/leads/new">
        <Plus className="mr-2 h-4 w-4" />
        Nuevo Lead
      </Link>
    </Button>
  );
}
