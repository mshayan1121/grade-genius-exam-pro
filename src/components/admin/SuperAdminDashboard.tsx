
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, 
  Award, 
  Building2, 
  BookOpen, 
  Users, 
  FileText,
  Calendar
} from "lucide-react";
import YearGroupsManager from "./YearGroupsManager";
import QualificationsManager from "./QualificationsManager";
import BoardsManager from "./BoardsManager";
import SubjectsManager from "./SubjectsManager";
import CoursesManager from "./CoursesManager";
import CreateExam from "../CreateExam";

interface SuperAdminDashboardProps {
  onLogout: () => void;
}

const SuperAdminDashboard = ({ onLogout }: SuperAdminDashboardProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Super Admin Dashboard
              </h1>
            </div>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs defaultValue="year-groups" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="year-groups" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Year Groups
              </TabsTrigger>
              <TabsTrigger value="qualifications" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Qualifications
              </TabsTrigger>
              <TabsTrigger value="boards" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Boards
              </TabsTrigger>
              <TabsTrigger value="subjects" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Subjects
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="exams" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Exams
              </TabsTrigger>
            </TabsList>

            <TabsContent value="year-groups">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Year Groups Management</h2>
                  <p className="text-sm text-gray-600">
                    Manage year groups that will be used for organizing students and courses.
                  </p>
                </div>
                <YearGroupsManager />
              </div>
            </TabsContent>

            <TabsContent value="qualifications">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Qualifications Management</h2>
                  <p className="text-sm text-gray-600">
                    Manage qualifications like GCSE, A Level, BTEC, etc.
                  </p>
                </div>
                <QualificationsManager />
              </div>
            </TabsContent>

            <TabsContent value="boards">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Exam Boards Management</h2>
                  <p className="text-sm text-gray-600">
                    Manage exam boards like AQA, Edexcel, OCR, etc.
                  </p>
                </div>
                <BoardsManager />
              </div>
            </TabsContent>

            <TabsContent value="subjects">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Subjects Management</h2>
                  <p className="text-sm text-gray-600">
                    Manage subjects like Mathematics, English, Science, etc.
                  </p>
                </div>
                <SubjectsManager />
              </div>
            </TabsContent>

            <TabsContent value="courses">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Courses Management</h2>
                  <p className="text-sm text-gray-600">
                    Create courses by combining qualifications, boards, subjects, and year groups.
                  </p>
                </div>
                <CoursesManager />
              </div>
            </TabsContent>

            <TabsContent value="exams">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Exams Management</h2>
                  <p className="text-sm text-gray-600">
                    Create and manage exams for different courses.
                  </p>
                </div>
                <CreateExam />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
