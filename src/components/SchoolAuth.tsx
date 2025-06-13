
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, GraduationCap } from "lucide-react";

interface SchoolAuthProps {
  onAuthSuccess: () => void;
  onSwitchToSuperAdmin: () => void;
}

const SchoolAuth = ({ onAuthSuccess, onSwitchToSuperAdmin }: SchoolAuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account already exists",
            description: "Please try logging in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. After confirming, contact your school admin to assign your role.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting school portal sign in with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        
        // More specific error handling
        if (error.message === "Invalid login credentials") {
          // Check if user exists by trying to find their user_roles
          const { data: userRoles, error: roleCheckError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', '00000000-0000-0000-0000-000000000000'); // This will fail, but we need to check differently
          
          console.log('Checking if user exists in our system...');
          
          toast({
            title: "Login failed",
            description: `Invalid email or password. If you were created by an admin, make sure you're using the correct email and the default password: 123456. If you're still having issues, contact your administrator.`,
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email not confirmed",
            description: "Please check your email and click the confirmation link, or contact your administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (!data.user) {
        toast({
          title: "Login failed",
          description: "No user data received",
          variant: "destructive",
        });
        return;
      }

      console.log('Sign in successful, checking roles for user:', data.user.id);
      
      // Check user roles
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      console.log('User roles query result:', { userRoles, roleError });

      if (roleError) {
        console.error('Error fetching roles:', roleError);
        await supabase.auth.signOut();
        toast({
          title: "Error checking permissions",
          description: roleError.message,
          variant: "destructive",
        });
        return;
      }

      // Check if user has any school-related roles
      const schoolRoles = ['school_admin', 'school_teacher', 'school_student'];
      const hasSchoolRole = userRoles?.some(role => schoolRoles.includes(role.role));
      
      // Check if user is super admin only
      const isSuperAdminOnly = userRoles?.length === 1 && userRoles[0].role === 'super_admin';
      
      console.log('Has school role?', hasSchoolRole);
      console.log('Is super admin only?', isSuperAdminOnly);
      
      if (isSuperAdminOnly) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "Super admins must use the Platform Admin login. Click 'Platform admin? Login here' below.",
          variant: "destructive",
        });
        return;
      }

      if (!hasSchoolRole) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You don't have the required school permissions. Please contact your administrator to assign you a role.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome!",
        description: "You have been logged in successfully.",
      });
      onAuthSuccess();
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">School Portal</CardTitle>
          <p className="text-sm text-gray-600">For school admins, teachers & students</p>
          <p className="text-xs text-blue-600 mt-1 font-medium">Default password for new users: 123456</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    New users created by admin should use: 123456
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Create a password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Confirm your password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="text-center mt-4">
            <Button variant="link" onClick={onSwitchToSuperAdmin} className="text-sm">
              Platform admin? Login here →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolAuth;
