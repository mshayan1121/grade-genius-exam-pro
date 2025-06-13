import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, BarChart3, LogOut, Settings } from "lucide-react";
import CreateExam from "@/components/CreateExam";
import TakeExam from "@/components/TakeExam";
import ViewResults from "@/components/ViewResults";
import AdminDashboard from "@/components/AdminDashboard";
import AuthSelector from "@/components/AuthSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { User, Session } from '@supabase/supabase-js';

type Page = 'home' | 'create' | 'take' | 'results' | 'admin';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isSuperAdmin, isSchoolAdmin, isLoading: roleLoading } = useUserRole(user);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      setCurrentPage('home');
    }
  };

  const handleAuthSuccess = () => {
    // Auth state will be updated automatically via onAuthStateChange
    setCurrentPage('home');
  };

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthSelector onAuthSuccess={handleAuthSuccess} />;
  }

  if (currentPage === 'create') {
    return <CreateExam onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'take') {
    return <TakeExam onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'results') {
    return <ViewResults onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'admin') {
    return <AdminDashboard onBack={() => setCurrentPage('home')} currentUser={user} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Exam Management System
            </h1>
            <p className="text-gray-600">
              Welcome, {user.email}! 
              {isSuperAdmin() && <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-sm font-medium">Super Admin</span>}
              {isSchoolAdmin() && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">School Admin</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {(isSuperAdmin() || isSchoolAdmin()) && (
              <Button variant="outline" onClick={() => setCurrentPage('admin')}>
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentPage('create')}>
            <CardHeader className="text-center">
              <BookOpen className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <CardTitle>Create Exam</CardTitle>
              <CardDescription>
                Design and create new exams with custom questions and marking schemes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Get Started</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentPage('take')}>
            <CardHeader className="text-center">
              <FileText className="w-12 h-12 mx-auto text-green-600 mb-4" />
              <CardTitle>Take Exam</CardTitle>
              <CardDescription>
                Take available exams and submit your answers for evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Start Exam</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentPage('results')}>
            <CardHeader className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-purple-600 mb-4" />
              <CardTitle>View Results</CardTitle>
              <CardDescription>
                Review exam submissions and AI-powered evaluation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Results</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Features</h2>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              <div>
                <h3 className="font-medium mb-2">For Educators</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Create custom exams</li>
                  <li>• Upload question images</li>
                  <li>• Set marking schemes</li>
                  <li>• AI-powered evaluation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">For Students</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Take exams online</li>
                  <li>• Upload handwritten work</li>
                  <li>• Instant feedback</li>
                  <li>• Detailed results</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
