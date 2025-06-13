
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface School {
  id: string;
  name: string;
}

interface CreateSchoolUserProps {
  schools: School[];
  userRole: 'super_admin' | 'school_admin';
  currentUserSchoolId?: string;
  onUserCreated: () => void;
}

const CreateSchoolUser = ({ schools, userRole, currentUserSchoolId, onUserCreated }: CreateSchoolUserProps) => {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [selectedSchool, setSelectedSchool] = useState(currentUserSchoolId || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const availableRoles = userRole === 'super_admin' 
    ? ['school_admin', 'school_teacher', 'school_student'] as const
    : ['school_teacher', 'school_student'] as const;

  const availableSchools = userRole === 'super_admin' 
    ? schools 
    : schools.filter(school => school.id === currentUserSchoolId);

  const handleCreateUser = async () => {
    if (!email || !selectedRole || !selectedSchool) {
      toast({
        title: "Missing information",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create user account
      const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
      });

      if (authError) throw authError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: selectedRole as AppRole,
          school_id: selectedSchool
        });

      if (roleError) throw roleError;

      toast({
        title: "User created successfully",
        description: `Account created for ${email}. Temporary password: ${tempPassword}`,
      });

      setEmail("");
      setSelectedRole("");
      setSelectedSchool(currentUserSchoolId || "");
      onUserCreated();
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Create New User
        </CardTitle>
        <CardDescription>
          {userRole === 'super_admin' 
            ? 'Create school admins, teachers, or students' 
            : 'Create teachers or students for your school'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="user-email">Email Address</Label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@school.edu"
          />
        </div>
        
        <div>
          <Label htmlFor="role-select">Role</Label>
          <Select value={selectedRole} onValueChange={(value: AppRole) => setSelectedRole(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace('school_', '').replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availableSchools.length > 1 && (
          <div>
            <Label htmlFor="school-select">School</Label>
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder="Select a school" />
              </SelectTrigger>
              <SelectContent>
                {availableSchools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={handleCreateUser} className="w-full" disabled={isLoading}>
          {isLoading ? "Creating user..." : "Create User"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreateSchoolUser;
