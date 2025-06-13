
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
      console.log('Creating user with email:', email, 'role:', selectedRole, 'school:', selectedSchool);
      
      // Use default password
      const defaultPassword = "123456";
      
      // First, check if user already exists by trying to sign them in
      const { data: existingUser, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: defaultPassword,
      });

      if (!signInError && existingUser.user) {
        // User exists and can sign in
        console.log('User already exists:', existingUser.user.id);
        
        // Check if they already have this role
        const { data: existingRoles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', existingUser.user.id)
          .eq('role', selectedRole)
          .eq('school_id', selectedSchool);
        
        if (existingRoles && existingRoles.length > 0) {
          toast({
            title: "Role already assigned",
            description: "This user already has this role for this school.",
            variant: "destructive",
          });
          // Sign out the user we just signed in for checking
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
        
        // Assign the new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: existingUser.user.id,
            role: selectedRole as AppRole,
            school_id: selectedSchool
          });

        // Sign out the user we just signed in for checking
        await supabase.auth.signOut();

        if (roleError) {
          console.error('Role assignment error:', roleError);
          throw roleError;
        }

        console.log('Role assigned to existing user successfully');

        toast({
          title: "Role assigned successfully",
          description: `Role assigned to existing user ${email}. Password: ${defaultPassword}`,
        });

        setEmail("");
        setSelectedRole("");
        setSelectedSchool(currentUserSchoolId || "");
        onUserCreated();
        setIsLoading(false);
        return;
      }

      // User doesn't exist or can't sign in with default password, create new user
      console.log('Creating new user...');
      
      // Sign up the user using the regular signup flow
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: defaultPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            email_confirm: true // Skip email confirmation for admin-created users
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user data returned');
      }

      console.log('User created successfully:', authData.user.id);

      // Wait a bit for the user to be properly created in the auth system
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now create the user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: selectedRole as AppRole,
          school_id: selectedSchool
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
        // If foreign key constraint fails, wait a bit more and try again
        if (roleError.message.includes('violates foreign key constraint')) {
          console.log('Foreign key constraint error, retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const { error: retryRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: selectedRole as AppRole,
              school_id: selectedSchool
            });
          
          if (retryRoleError) {
            throw retryRoleError;
          }
        } else {
          throw roleError;
        }
      }

      console.log('Role assigned successfully');

      toast({
        title: "User created successfully",
        description: `Account created for ${email}. Default password: ${defaultPassword}`,
      });

      setEmail("");
      setSelectedRole("");
      setSelectedSchool(currentUserSchoolId || "");
      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
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
          <br />
          <span className="text-blue-600 font-medium">Default password: 123456</span>
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

        <Button onClick={handleCreateUser} className="w-full" disabled={isLoading}>
          {isLoading ? "Creating user..." : "Create User"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreateSchoolUser;
