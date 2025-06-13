
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, BookOpen } from "lucide-react";

interface Course {
  id: string;
  name: string;
  description: string | null;
}

interface School {
  id: string;
  name: string;
}

interface SchoolSubscription {
  id: string;
  school_id: string;
  course_id: string;
  is_active: boolean;
  subscribed_at: string;
  school_name?: string;
  course_name?: string;
}

const SchoolCourseManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, description');
      
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name');
      
      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Fetch subscriptions with school and course names
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('school_subscriptions')
        .select(`
          id,
          school_id,
          course_id,
          is_active,
          subscribed_at,
          schools!inner(name),
          courses!inner(name)
        `);
      
      if (subscriptionsError) throw subscriptionsError;
      
      // Transform the data to include school and course names
      const transformedSubscriptions = subscriptionsData?.map(sub => ({
        id: sub.id,
        school_id: sub.school_id,
        course_id: sub.course_id,
        is_active: sub.is_active,
        subscribed_at: sub.subscribed_at,
        school_name: (sub.schools as any)?.name,
        course_name: (sub.courses as any)?.name
      })) || [];
      
      setSubscriptions(transformedSubscriptions);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const assignCourseToSchool = async () => {
    if (!selectedSchool || !selectedCourse) {
      toast({
        title: "Missing selection",
        description: "Please select both a school and a course",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if subscription already exists
      const existingSubscription = subscriptions.find(
        sub => sub.school_id === selectedSchool && sub.course_id === selectedCourse
      );

      if (existingSubscription) {
        toast({
          title: "Already assigned",
          description: "This course is already assigned to this school",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('school_subscriptions')
        .insert({
          school_id: selectedSchool,
          course_id: selectedCourse,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Course assigned",
        description: "Course has been successfully assigned to the school",
      });

      setSelectedSchool("");
      setSelectedCourse("");
      fetchData();
    } catch (error: any) {
      console.error('Error assigning course:', error);
      toast({
        title: "Error assigning course",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('school_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Subscription removed",
        description: "Course subscription has been removed successfully",
      });

      fetchData();
    } catch (error: any) {
      console.error('Error removing subscription:', error);
      toast({
        title: "Error removing subscription",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading course assignments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Assign Course to School */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Assign Course to School
          </CardTitle>
          <CardDescription>
            Give schools access to specific courses so their teachers can use the exams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Select School</label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a school" />
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

            <div>
              <label className="text-sm font-medium">Select Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={assignCourseToSchool} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Assign Course to School
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Current Course Assignments</CardTitle>
          <CardDescription>
            Schools and their assigned courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No course assignments yet. Assign courses to schools above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">
                      {subscription.school_name}
                    </TableCell>
                    <TableCell>{subscription.course_name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        subscription.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subscription.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(subscription.subscribed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeSubscription(subscription.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolCourseManager;
