import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Scale, Mail, Lock, User, Eye, EyeOff, Building2, ArrowRight, ShoppingCart, Shield, Sparkles, Gavel } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);

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
      navigate('/despacho/portada');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-lg gradient-brand">
              <Scale className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            LexMarket<span className="text-primary">™</span>
          </h1>
          <p className="text-muted-foreground text-sm">Asesor.Legal</p>
        </div>

        {/* Alta Despacho CTA — BEFORE login */}
        <Card className="border-2 border-primary/30 hover:border-primary/50 transition-all duration-300 cursor-pointer group relative overflow-hidden"
          onClick={() => navigate('/alta-despacho')}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-blue-500/5 group-hover:from-primary/10 group-hover:to-blue-500/10 transition-all" />
          <CardContent className="p-5 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base">¿Eres abogado? Alta de despacho</p>
                <p className="text-xs text-muted-foreground mt-0.5">Accede al marketplace de casos jurídicos en exclusiva</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </div>
            <div className="flex gap-3 mt-3 ml-[60px]">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShoppingCart className="h-3 w-3" /> Market exclusivo
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Shield className="h-3 w-3" /> Contactos garantizados
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3" /> IA Lexcore™
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Card */}
        <Card className="shadow-large border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Accede a tu cuenta</CardTitle>
            <CardDescription>
              Market jurídico · Contactos garantizados y exclusivos
            </CardDescription>
            <p className="text-[11px] text-muted-foreground mt-1">
              Los contactos no se ofrecen a múltiples despachos — todos son en exclusiva para un solo contratante
            </p>
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
                      <Input id="login-password" type={showLoginPw ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                      <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => setShowLoginPw(!showLoginPw)}>
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
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
                      <Input id="signup-password" type={showSignupPw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" className="pl-10 pr-10" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                      <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => setShowSignupPw(!showSignupPw)}>
                        {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
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
          LexMarket™ v1.0 — © 2026 Asesor.Legal
        </p>
      </div>
    </div>
  );
}
