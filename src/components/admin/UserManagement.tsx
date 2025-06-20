
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Crown, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');

      // First, get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw profileError;
      }

      console.log('Profiles fetched:', profiles);

      // Then, get all user roles
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) {
        console.error('Error fetching roles:', roleError);
        throw roleError;
      }

      console.log('Roles fetched:', roles);

      // Combine profiles with roles
      const formattedUsers: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find(role => role.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: userRole?.role || 'user',
          created_at: profile.created_at
        };
      });

      console.log('Formatted users:', formattedUsers);

      setUsers(formattedUsers);
      
      // Check if there are any admins
      const adminExists = formattedUsers.some(user => user.role === 'admin');
      setHasAdmin(adminExists);
      console.log('Has admin:', adminExists);

    } catch (error: any) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar os usuários: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const promoteCurrentUserToAdmin = async () => {
    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Promoting current user to admin:', currentUser.id);

      // Check if user already has a role
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing role:', checkError);
        throw checkError;
      }

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', currentUser.id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: currentUser.id, role: 'admin' });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Você foi promovido a administrador! Faça logout e login novamente para que as mudanças tenham efeito.",
      });

      fetchUsers(); // Recarregar lista
    } catch (error: any) {
      console.error('Error promoting user to admin:', error);
      toast({
        title: "Erro",
        description: `Não foi possível criar o administrador: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário promovido a administrador!",
      });

      fetchUsers(); // Recarregar lista
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Não foi possível promover o usuário: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const demoteToUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'user' })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário rebaixado para usuário comum.",
      });

      fetchUsers(); // Recarregar lista
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Não foi possível rebaixar o usuário: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão para criar primeiro admin se não houver nenhum */}
      {!hasAdmin && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <UserCog className="h-5 w-5" />
              Nenhum administrador encontrado
            </CardTitle>
            <CardDescription className="text-orange-700">
              Você precisa criar o primeiro administrador do sistema para poder gerenciar outros usuários.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={promoteCurrentUserToAdmin}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Crown className="h-4 w-4 mr-2" />
              Tornar-me Administrador
            </Button>
            <p className="text-sm text-orange-600 mt-2">
              Isso irá promover sua conta atual ({currentUser?.email}) a administrador.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie os papéis dos usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">
                      {user.full_name || user.email}
                    </h3>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <Crown className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
                      {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                    </Badge>
                    {user.id === currentUser?.id && (
                      <Badge variant="outline" className="text-xs">
                        Você
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-400">
                    Cadastrado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {user.role === 'user' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => promoteToAdmin(user.id)}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Crown className="h-4 w-4 mr-1" />
                      Promover a Admin
                    </Button>
                  ) : (
                    user.id !== currentUser?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => demoteToUser(user.id)}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Rebaixar para Usuário
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
