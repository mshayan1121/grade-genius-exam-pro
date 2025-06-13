
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import CreateSchoolUser from "@/components/CreateSchoolUser";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  school_id: string | null;
  created_at: string;
}

interface School {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Get current user's auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { isSuperAdmin, isSchoolAdmin, userRoles: currentUserRoles } = useUserRole(currentUser);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    fetchUserRoles();
    fetchSchools();
  }, []);

  const fetchUserRoles = async () => {
    try {
      console.log('Fetching user roles...');
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }
      console.log('User roles fetched:', data);
      setUserRoles(data || []);
    } catch (error: any) {
      console.error('Error in fetchUserRoles:', error);
      toast({
        title: "Error fetching user roles",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSchools = async () => {
    try {
      console.log('Fetching schools...');
      const { data, error } = await supabase
        .from('schools')
        .select('id, name');
      
      if (error) {
        console.error('Error fetching schools:', error);
        throw error;
      }
      console.log('Schools fetched:', data);
      setSchools(data || []);
    } catch (error: any) {
      console.error('Error in fetchSchools:', error);
      toast({
        title: "Error fetching schools",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeRole = async (roleId: string) => {
    try {
      console.log('Removing role:', roleId);
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) {
        console.error('Error removing role:', error);
        throw error;
      }

      toast({
        title: "Role removed",
        description: "User role has been removed successfully",
      });

      fetchUserRoles();
    } catch (error: any) {
      console.error('Error in removeRole:', error);
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUserCreated = () => {
    fetchUserRoles();
  };

  if (isLoading) {
    return <div className="text-center">Loading users...</div>;
  }

  // Determine user permissions
  const userRole = isSuperAdmin() ? 'super_admin' : isSchoolAdmin() ? 'school_admin' : null;
  const currentUserSchoolId = currentUserRoles.find(role => role.role === 'school_admin')?.school_id;

  if (!userRole) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600 mt-2">You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Users Management</h2>
        <p className="text-gray-600">Create and manage user accounts and roles</p>
      </div>

      <CreateSchoolUser 
        schools={schools}
        userRole={userRole}
        currentUserSchoolId={currentUserSchoolId}
        onUserCreated={handleUserCreated}
      />

      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>
            All user roles in the system. Default password for new users: <strong>123456</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Default Password</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map((userRole) => (
                <TableRow key={userRole.id}>
                  <TableCell className="font-mono text-sm">{userRole.user_id}</TableCell>
                  <TableCell>
                    <span className="capitalize">{userRole.role.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell>
                    {userRole.school_id ? 
                      schools.find(s => s.id === userRole.school_id)?.name || 'Unknown School' 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{new Date(userRole.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">123456</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeRole(userRole.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
