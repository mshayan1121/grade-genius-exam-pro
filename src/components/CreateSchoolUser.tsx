
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

  // Helper function to wait for user to be created
  const waitForUserCreation = async (userId: string, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to query the user roles table - this will fail if the user doesn't exist
        const { error } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        
        // If the query doesn't throw an error, the user exists
        if (!error || !error.message.includes('violates foreign key constraint')) {
          return true;
        }
      } catch (e) {
        console.log(`Attempt ${i + 1}: User not ready yet, waiting...`);
      }
      
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  };

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
        
        if (authError.message.includes("User already registered")) {
          // User exists, try to find them and assign role
          console.log('User already exists, attempting to find and assign role...');
          
          // Try to sign in to get the user data
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: defaultPassword,
          });
          
          if (signInError) {
            console.error('Could not sign in existing user:', signInError);
            toast({
              title: "User exists but cannot access",
              description: "User already exists but we cannot access their account. They may have a different password.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          
          if (signInData.user) {
            console.log('Found existing user:', signInData.user.id);
            
            // Check if they already have this role
            const { data: existingRoles } = await supabase
              .from('user_roles')
              .select('*')
              .eq('user_id', signInData.user.id)
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
                user_id: signInData.user.id,
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
        } else {
          throw authError;
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user data returned');
      }

      console.log('User created successfully:', authData.user.id);

      // Wait for the user to be properly created in the database
      console.log('Waiting for user to be properly created...');
      const userExists = await waitForUserCreation(authData.user.id);
      
      if (!userExists) {
        throw new Error('User creation timed out - please try again');
      }

      console.log('User confirmed to exist, creating role...');

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
        throw roleError;
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
