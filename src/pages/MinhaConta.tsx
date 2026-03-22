import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { KeyRound, Lock, Eye, EyeOff } from 'lucide-react';

const MinhaConta = () => {
  const { toast } = useToast();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [loadingPin, setLoadingPin] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'A nova senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }

    setLoadingPassword(true);
    try {
      // Verify current password by re-signing in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Usuário não encontrado');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: 'Senha atual incorreta', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Erro ao alterar senha', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleChangePin = async () => {
    if (pinStep === 'current') {
      if (currentPin.length !== 4) return;
      // Validate current PIN
      setLoadingPin(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');
        const { data, error } = await supabase.rpc('validate_user_pin', { _user_id: user.id, _pin: currentPin } as any);
        if (error) throw error;
        if (!data) {
          toast({ title: 'PIN atual incorreto', variant: 'destructive' });
          setCurrentPin('');
          return;
        }
        setPinStep('new');
      } catch {
        toast({ title: 'Erro ao validar PIN', variant: 'destructive' });
      } finally {
        setLoadingPin(false);
      }
      return;
    }

    if (pinStep === 'new') {
      if (newPin.length !== 4) return;
      setPinStep('confirm');
      return;
    }

    // confirm step
    if (confirmPin !== newPin) {
      toast({ title: 'PINs não coincidem', variant: 'destructive' });
      setConfirmPin('');
      return;
    }

    setLoadingPin(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.rpc('set_user_pin', { _user_id: user.id, _pin: newPin } as any);
      if (error) throw error;
      toast({ title: 'PIN alterado com sucesso!' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinStep('current');
    } catch {
      toast({ title: 'Erro ao alterar PIN', variant: 'destructive' });
    } finally {
      setLoadingPin(false);
    }
  };

  const pinLabels = {
    current: { title: 'Digite seu PIN atual', btn: 'Validar' },
    new: { title: 'Digite o novo PIN', btn: 'Continuar' },
    confirm: { title: 'Confirme o novo PIN', btn: 'Salvar novo PIN' },
  };

  const pinValue = pinStep === 'current' ? currentPin : pinStep === 'new' ? newPin : confirmPin;
  const setPinValue = pinStep === 'current' ? setCurrentPin : pinStep === 'new' ? setNewPin : setConfirmPin;

  return (
    <Layout title="Minha Conta">
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Alterar Senha</CardTitle>
            </div>
            <CardDescription>Informe a senha atual e defina uma nova</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-2.5 text-muted-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-muted-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={loadingPassword} className="w-full">
              {loadingPassword ? 'Salvando...' : 'Alterar Senha'}
            </Button>
          </CardContent>
        </Card>

        {/* Alterar PIN */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Alterar PIN</CardTitle>
            </div>
            <CardDescription>{pinLabels[pinStep].title}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <InputOTP maxLength={4} value={pinValue} onChange={setPinValue} onComplete={handleChangePin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-14 w-14 text-2xl" />
                <InputOTPSlot index={1} className="h-14 w-14 text-2xl" />
                <InputOTPSlot index={2} className="h-14 w-14 text-2xl" />
                <InputOTPSlot index={3} className="h-14 w-14 text-2xl" />
              </InputOTPGroup>
            </InputOTP>
            <Button onClick={handleChangePin} disabled={pinValue.length !== 4 || loadingPin} className="w-full">
              {loadingPin ? 'Processando...' : pinLabels[pinStep].btn}
            </Button>
            {pinStep !== 'current' && (
              <button
                type="button"
                onClick={() => { setPinStep('current'); setCurrentPin(''); setNewPin(''); setConfirmPin(''); }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Voltar ao início
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MinhaConta;
