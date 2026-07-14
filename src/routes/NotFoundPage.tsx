import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-8 text-center">
        <p className="text-5xl font-black text-text-primary">404</p>
        <p className="text-lg font-bold text-text-primary mt-3">Page not found</p>
        <p className="text-sm text-text-muted mt-2">The page you were looking for does not exist.</p>
        <Button className="mt-6" onClick={() => navigate('/')}>Go to dashboard</Button>
      </Card>
    </div>
  );
}
