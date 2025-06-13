
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, BarChart3 } from "lucide-react";
import CreateExam from "@/components/CreateExam";
import TakeExam from "@/components/TakeExam";
import ViewResults from "@/components/ViewResults";

type Page = 'home' | 'create' | 'take' | 'results';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  if (currentPage === 'create') {
    return <CreateExam onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'take') {
    return <TakeExam onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'results') {
    return <ViewResults onBack={() => setCurrentPage('home')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Exam Management System
          </h1>
          <p className="text-gray-600">
            Create exams, take tests, and view AI-powered results
          </p>
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
