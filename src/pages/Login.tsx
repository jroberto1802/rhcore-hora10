import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import rhcoreLogo from '@/assets/rhcore-logo.png';
interface LoginForm {
  email: string;
  password: string;
}
const Login = () => {
  const [loading, setLoading] = useState(false);
  const {
    signIn
  } = useAuth();
  const {
    toast
  } = useToast();
  const loginForm = useForm<LoginForm>();
  const onLogin = async (data: LoginForm) => {
    setLoading(true);
    const {
      error
    } = await signIn(data.email, data.password);
    if (error) {
      toast({
        title: "Erro no login",
        description: error,
        variant: "destructive"
      });
    }
    setLoading(false);
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4 gap-0">
            <img src={rhcoreLogo} alt="RHCore Logo" className="h-12 w-12 mr-2 object-fill" />
            <h1 className="text-3xl text-primary font-bold">RHCore
          </h1>
          </div>
          <p className="text-muted-foreground">
            Plataforma de gestão de recursos humanos
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5" />
              Acesso ao Sistema
            </CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField control={loginForm.control} name="email" rules={{
                required: "Email é obrigatório"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                <FormField control={loginForm.control} name="password" rules={{
                required: "Senha é obrigatória"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Acesso restrito • Entre em contato com o administrador para obter credenciais
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Login;