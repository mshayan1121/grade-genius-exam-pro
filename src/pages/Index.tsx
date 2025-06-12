
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, ClipboardList } from "lucide-react";
import CreateExam from "@/components/CreateExam";
import TakeExam from "@/components/TakeExam";
import ViewResults from "@/components/ViewResults";

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'take' | 'results'>('home');

  if (currentView === 'create') {
    return <CreateExam onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'take') {
    return <TakeExam onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'results') {
    return <ViewResults onBack={() => setCurrentView('home')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Grade Genius Exam Pro</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered exam evaluation system for teachers and students
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('create')}>
            <CardHeader className="text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>Create Exam</CardTitle>
              <CardDescription>
                Create exams with questions, images, and mark allocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Start Creating</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('take')}>
            <CardHeader className="text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Take Exam</CardTitle>
              <CardDescription>
                Students can answer questions with text and image uploads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Take Exam</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('results')}>
            <CardHeader className="text-center">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 text-purple-600" />
              <CardTitle>View Results</CardTitle>
              <CardDescription>
                Review AI-powered evaluations and detailed feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">View Results</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
