import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PinAccess = () => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkPin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('pin')
        .eq('id', user.id)
        .single();

      setHasPin(!!data?.pin);
      setChecking(false);
    };
    checkPin();
  }, [navigate]);

  const handleCreatePin = async () => {
    if (step === 'enter') {
      if (pin.length !== 4) return;
      setStep('confirm');
      return;
    }

    if (confirmPin !== pin) {
      toast({ title: 'PINs não coincidem', description: 'Digite o mesmo PIN nos dois campos.', variant: 'destructive' });
      setConfirmPin('');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase.rpc('set_user_pin', { _user_id: user.id, _pin: pin } as any);
      if (error) throw error;

      sessionStorage.setItem('pin_validated', 'true');
      toast({ title: 'PIN criado com sucesso!', description: 'Seu PIN pessoal foi configurado.' });
      navigate('/selecionar-unidade');
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar o PIN.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePin = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase.rpc('validate_user_pin', { _user_id: user.id, _pin: pin } as any);
      if (error) throw error;

      if (data) {
        sessionStorage.setItem('pin_validated', 'true');
        navigate('/selecionar-unidade');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('pin_validated');
    navigate('/');
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  // ===== CREATE PIN FLOW =====
  if (!hasPin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {step === 'enter' ? 'Criar PIN de Acesso' : 'Confirmar PIN'}
            </CardTitle>
            <CardDescription>
              {step === 'enter'
                ? 'Crie um PIN de 4 dígitos para proteger seu acesso'
                : 'Digite o PIN novamente para confirmar'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {step === 'enter' ? (
              <InputOTP maxLength={4} value={pin} onChange={setPin}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-14 text-2xl" />
                  <InputOTPSlot index={1} className="h-14 w-14 text-2xl" />
                  <InputOTPSlot index={2} className="h-14 w-14 text-2xl" />
                  <InputOTPSlot index={3} className="h-14 w-14 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            ) : (
              <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin} onComplete={handleCreatePin}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-14 text-2xl" />
                  <InputOTPSlot index={1} className="h-14 w-14 text-2xl" />
                  <InputOTPSlot index={2} className="h-14 w-14 text-2xl" />
                  <InputOTPSlot index={3} className="h-14 w-14 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            )}
            <Button
              onClick={handleCreatePin}
              disabled={(step === 'enter' ? pin.length !== 4 : confirmPin.length !== 4) || loading}
              className="w-full h-12 text-base"
            >
              <Lock className="mr-2 h-4 w-4" />
              {loading ? 'Salvando...' : step === 'enter' ? 'Continuar' : 'Confirmar e Acessar'}
            </Button>
            {step === 'confirm' && (
              <button
                type="button"
                onClick={() => { setStep('enter'); setConfirmPin(''); setPin(''); }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Voltar e digitar novamente
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Sair da conta
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== VALIDATE PIN FLOW =====
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verificação de PIN</CardTitle>
          <CardDescription>Digite seu PIN de 4 dígitos para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <InputOTP maxLength={4} value={pin} onChange={setPin} onComplete={handleValidatePin}>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-14 w-14 text-2xl" />
              <InputOTPSlot index={1} className="h-14 w-14 text-2xl" />
              <InputOTPSlot index={2} className="h-14 w-14 text-2xl" />
              <InputOTPSlot index={3} className="h-14 w-14 text-2xl" />
            </InputOTPGroup>
          </InputOTP>
          <Button onClick={handleValidatePin} disabled={pin.length !== 4 || loading} className="w-full h-12 text-base">
            <Lock className="mr-2 h-4 w-4" />
            {loading ? 'Validando...' : 'Acessar'}
          </Button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Sair da conta
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PinAccess;