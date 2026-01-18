import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Scale, Mail, Lock, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Error al registrarse');
    } else {
      toast.success('¡Cuenta creada! Bienvenido.');
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
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
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
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" type="text" placeholder="Tu nombre" className="pl-10" value={signupName} onChange={e => setSignupName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="tu@email.com" className="pl-10" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" className="pl-10" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-brand" disabled={loading}>
                    {loading ? 'Creando cuenta...' : 'Registrarse'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Lexcore™ v1.0 — © 2025 Asesor.Legal
        </p>
      </div>
    </div>
  );
}
