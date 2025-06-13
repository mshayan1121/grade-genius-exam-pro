
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield } from "lucide-react";

interface SuperAdminAuthProps {
  onAuthSuccess: () => void;
  onSwitchToSchool: () => void;
}

const SuperAdminAuth = ({ onAuthSuccess, onSwitchToSchool }: SuperAdminAuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting super admin sign in...');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Sign in successful, checking roles...');
        
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user?.id);
        
        // Check if user has super admin role
        const { data: userRoles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id);

        console.log('User roles query result:', { userRoles, roleError });

        if (roleError) {
          console.error('Error fetching roles:', roleError);
          toast({
            title: "Error checking permissions",
            description: roleError.message,
            variant: "destructive",
          });
          return;
        }

        const isSuperAdmin = userRoles?.some(role => role.role === 'super_admin');
        console.log('Is super admin?', isSuperAdmin);
        
        if (!isSuperAdmin) {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "You don't have super admin privileges. Please use the school login.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Welcome Super Admin!",
          description: "You have been logged in successfully.",
        });
        onAuthSuccess();
      }
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate secret key first
    if (secretKey !== "exaim") {
      toast({
        title: "Invalid secret key",
        description: "You need the correct secret key to create a super admin account.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      console.log('Creating super admin account...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        console.log('User created, adding super admin role...', data.user.id);
        
        // Create super admin role for this user
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'super_admin'
          });

        if (roleError) {
          console.error('Error creating super admin role:', roleError);
          toast({
            title: "Role assignment failed",
            description: "Account created but role assignment failed. Please contact support.",
            variant: "destructive",
          });
        } else {
          console.log('Super admin role assigned successfully');
          toast({
            title: "Account created!",
            description: "Please check your email to confirm your account.",
          });
          setIsSignUp(false);
        }
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Super Admin Portal</CardTitle>
          <p className="text-sm text-gray-600">
            {isSignUp ? "Create your admin account" : "Platform administration access"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@platform.com"
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
            {isSignUp && (
              <>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="secretKey">Super Admin Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    required
                    placeholder="Enter secret key to create super admin account"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You need the secret key to create a super admin account
                  </p>
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? (isSignUp ? "Creating account..." : "Signing in...") 
                : (isSignUp ? "Create Super Admin Account" : "Sign In as Super Admin")
              }
            </Button>
          </form>
          
          <div className="text-center space-y-2">
            <Button 
              variant="link" 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="text-sm"
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </Button>
            <Button variant="link" onClick={onSwitchToSchool} className="text-sm">
              School user? Login here →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminAuth;
