import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Scale, Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Error al iniciar sesión');
    } else {
      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-lg gradient-brand">
              <Scale className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Lexcore<span className="text-primary">™</span>
          </h1>
          <p className="text-muted-foreground text-sm">Asesor.Legal</p>
        </div>

        <Card className="shadow-large border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Accede a tu cuenta</CardTitle>
            <CardDescription>CRM para gestión de leads legales</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="login-email" type="email" placeholder="tu@email.com" className="pl-10" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="login-password" type="password" placeholder="••••••••" className="pl-10" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-brand" disabled={loading}>
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿Eres un despacho de abogados?{' '}
                <Link to="/registro-despacho" className="text-primary hover:underline font-medium">
                  Solicita tu alta aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Lexcore™ v1.0 — © 2025 Asesor.Legal
        </p>
      </div>
    </div>
  );
}
