
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
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "" as AppRole | "",
    school_id: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRoles();
    fetchSchools();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserRoles(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching user roles",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name');
      
      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching schools",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.role) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if ((newUser.role === 'school_admin' || newUser.role === 'school_teacher' || newUser.role === 'school_student') && !newUser.school_id) {
      toast({
        title: "School required",
        description: "Please select a school for this role",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: newUser.role as AppRole,
            school_id: newUser.role === 'super_admin' ? null : (newUser.school_id || null)
          });

        if (roleError) throw roleError;

        toast({
          title: "User created",
          description: "User has been created successfully",
        });

        setNewUser({ email: "", password: "", role: "", school_id: "" });
        fetchUserRoles();
      }
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Role removed",
        description: "User role has been removed successfully",
      });

      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Users Management</h2>
        <p className="text-gray-600">Create and manage user accounts and roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
          <CardDescription>Add a new user to the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Enter user email"
              />
            </div>
            <div>
              <Label htmlFor="user-password">Password *</Label>
              <Input
                id="user-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="user-role">Role *</Label>
              <Select value={newUser.role} onValueChange={(value: AppRole) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="school_admin">School Admin</SelectItem>
                  <SelectItem value="school_teacher">School Teacher</SelectItem>
                  <SelectItem value="school_student">School Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(newUser.role === 'school_admin' || newUser.role === 'school_teacher' || newUser.role === 'school_student') && (
              <div>
                <Label htmlFor="user-school">School *</Label>
                <Select value={newUser.school_id} onValueChange={(value) => setNewUser({ ...newUser, school_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={createUser} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>All user roles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Created</TableHead>
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
