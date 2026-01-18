import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, Eye, EyeOff, Check, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { useApiSetting, useSaveApiKey, useDeleteApiKey } from '@/hooks/useApiSettings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ApiKeys() {
  const { data: openAIKey, isLoading } = useApiSetting('OPENAI_API_KEY');
  const saveApiKey = useSaveApiKey();
  const deleteApiKey = useDeleteApiKey();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyValue, setKeyValue] = useState('');

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    
    await saveApiKey.mutateAsync({ 
      keyName: 'OPENAI_API_KEY', 
      keyValue: keyValue.trim() 
    });
    
    setKeyValue('');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteApiKey.mutateAsync('OPENAI_API_KEY');
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 7) + '...' + key.slice(-4);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Key className="h-6 w-6" />
          API Keys
        </h1>
        <p className="text-muted-foreground">Gestiona las claves de API para integraciones</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            OpenAI API Key
          </CardTitle>
          <CardDescription>
            Necesaria para la extracción automática de datos y el scoring Lexcore
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : openAIKey && !isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
                  <span>{showKey ? openAIKey.key_value : maskKey(openAIKey.key_value)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El motor Lexcore dejará de funcionar hasta que configures una nueva API Key.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Check className="h-3 w-3 mr-1" />
                  Configurada
                </Badge>
                <span className="text-muted-foreground">
                  Última actualización: {format(new Date(openAIKey.updated_at), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!openAIKey && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">API Key no configurada</p>
                    <p className="text-amber-600 dark:text-amber-500">El motor Lexcore requiere una API Key de OpenAI para funcionar.</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key de OpenAI</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-proj-..."
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Obtén tu API Key en <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a>
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSave} 
                  disabled={!keyValue.trim() || saveApiKey.isPending}
                >
                  {saveApiKey.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={() => { setIsEditing(false); setKeyValue(''); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft border-dashed">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Key className="h-5 w-5" />
            <div>
              <p className="font-medium">Más integraciones próximamente</p>
              <p className="text-sm">Twilio, SendGrid, y otros servicios estarán disponibles pronto.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
