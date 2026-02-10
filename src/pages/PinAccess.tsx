import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PinAccess = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleValidate = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_pin', { input_pin: pin });
      if (error) throw error;
      if (data) {
        sessionStorage.setItem('pin_validated', 'true');
        navigate('/dashboard');
      } else {
        toast({ title: 'PIN incorreto', description: 'Verifique e tente novamente.', variant: 'destructive' });
        setPin('');
      }
    } catch {
      toast({ title: 'Erro de conexão', description: 'Não foi possível validar o PIN.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Auditoria de Folha</CardTitle>
          <CardDescription>Digite o PIN de 4 dígitos para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <InputOTP maxLength={4} value={pin} onChange={setPin} onComplete={handleValidate}>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-14 w-14 text-2xl" />
              <InputOTPSlot index={1} className="h-14 w-14 text-2xl" />
              <InputOTPSlot index={2} className="h-14 w-14 text-2xl" />
              <InputOTPSlot index={3} className="h-14 w-14 text-2xl" />
            </InputOTPGroup>
          </InputOTP>
          <Button onClick={handleValidate} disabled={pin.length !== 4 || loading} className="w-full h-12 text-base">
            <Lock className="mr-2 h-4 w-4" />
            {loading ? 'Validando...' : 'Acessar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PinAccess;
