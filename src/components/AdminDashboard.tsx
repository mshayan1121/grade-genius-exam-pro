import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from '@supabase/supabase-js';
import { ArrowLeft, Plus, Trash2, Building, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import CreateSchoolUser from "./CreateSchoolUser";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  school_id: string | null;
  user_email?: string;
  school_name?: string;
}

interface School {
  id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface AdminDashboardProps {
  onBack: () => void;
  currentUser: User;
}

const AdminDashboard = ({ onBack, currentUser }: AdminDashboardProps) => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [newSchool, setNewSchool] = useState({ name: "", address: "", contact_email: "", contact_phone: "" });
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isSuperAdmin, isSchoolAdmin, userRoles: currentUserRoles } = useUserRole(currentUser);

  const currentUserSchoolId = currentUserRoles.find(role => role.role === 'school_admin')?.school_id;

  useEffect(() => {
    fetchUserRoles();
    fetchSchools();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      
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
        .select('*');
      
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

  const createSchool = async () => {
    if (!newSchool.name.trim()) {
      toast({
        title: "School name required",
        description: "Please enter a school name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .insert([newSchool]);

      if (error) throw error;

      toast({
        title: "School created",
        description: "School has been created successfully",
      });

      setNewSchool({ name: "", address: "", contact_email: "", contact_phone: "" });
      fetchSchools();
    } catch (error: any) {
      toast({
        title: "Error creating school",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Missing information",
        description: "Please select both user and role",
        variant: "destructive",
      });
      return;
    }

    if ((selectedRole === 'school_admin' || selectedRole === 'school_teacher' || selectedRole === 'school_student') && !selectedSchool) {
      toast({
        title: "School required",
        description: "Please select a school for this role",
        variant: "destructive",
      });
      return;
    }

    try {
      const roleData = {
        user_id: selectedUser,
        role: selectedRole as AppRole,
        school_id: selectedRole === 'super_admin' ? null : selectedSchool || null
      };

      const { error } = await supabase
        .from('user_roles')
        .insert(roleData);

      if (error) throw error;

      toast({
        title: "Role assigned",
        description: "User role has been assigned successfully",
      });

      setSelectedUser("");
      setSelectedRole("");
      setSelectedSchool("");
      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: "Error assigning role",
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {isSuperAdmin() ? 'Super Admin Dashboard' : 'School Admin Dashboard'}
            </h1>
            <p className="text-gray-600">
              {isSuperAdmin() ? 'Manage schools, users, and system settings' : 'Manage your school users and settings'}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create School - Only for Super Admins */}
          {isSuperAdmin() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Create School
                </CardTitle>
                <CardDescription>Add a new school to the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="school-name">School Name *</Label>
                  <Input
                    id="school-name"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <Label htmlFor="school-address">Address</Label>
                  <Input
                    id="school-address"
                    value={newSchool.address}
                    onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                    placeholder="Enter school address"
                  />
                </div>
                <div>
                  <Label htmlFor="school-email">Contact Email</Label>
                  <Input
                    id="school-email"
                    type="email"
                    value={newSchool.contact_email}
                    onChange={(e) => setNewSchool({ ...newSchool, contact_email: e.target.value })}
                    placeholder="Enter contact email"
                  />
                </div>
                <div>
                  <Label htmlFor="school-phone">Contact Phone</Label>
                  <Input
                    id="school-phone"
                    value={newSchool.contact_phone}
                    onChange={(e) => setNewSchool({ ...newSchool, contact_phone: e.target.value })}
                    placeholder="Enter contact phone"
                  />
                </div>
                <Button onClick={createSchool} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create School
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Create User */}
          <CreateSchoolUser
            schools={schools}
            userRole={isSuperAdmin() ? 'super_admin' : 'school_admin'}
            currentUserSchoolId={currentUserSchoolId}
            onUserCreated={() => {
              fetchUserRoles();
              toast({
                title: "User created",
                description: "New user has been created successfully",
              });
            }}
          />

          {/* Manual Role Assignment - Only for Super Admins */}
          {isSuperAdmin() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Assign User Role (Manual)
                </CardTitle>
                <CardDescription>Manually assign roles to existing users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="user-email">User Email/ID</Label>
                  <Input
                    id="user-email"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    placeholder="Enter user email or ID"
                  />
                </div>
                <div>
                  <Label htmlFor="role-select">Role</Label>
                  <Select value={selectedRole} onValueChange={(value: AppRole) => setSelectedRole(value)}>
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
                {(selectedRole === 'school_admin' || selectedRole === 'school_teacher' || selectedRole === 'school_student') && (
                  <div>
                    <Label htmlFor="school-select">School</Label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
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
                <Button onClick={assignRole} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Role
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Schools List - Only for Super Admins */}
        {isSuperAdmin() && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Schools</CardTitle>
              <CardDescription>List of all schools in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Contact Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell>{school.address || 'N/A'}</TableCell>
                      <TableCell>{school.contact_email || 'N/A'}</TableCell>
                      <TableCell>{school.contact_phone || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* User Roles List */}
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>
              {isSuperAdmin() ? 'Manage all user roles and permissions' : 'Manage users in your school'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles
                  .filter(userRole => 
                    isSuperAdmin() || userRole.school_id === currentUserSchoolId
                  )
                  .map((userRole) => (
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
    </div>
  );
};

export default AdminDashboard;
