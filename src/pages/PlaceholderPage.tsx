import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.slice(1).replace(/-/g, ' ');

  return (
    <div className="p-6">
      <Card>
        <CardContent className="py-16 text-center">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold capitalize mb-2">{pageName || 'Página'}</h2>
          <p className="text-muted-foreground">
            Esta página está em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
