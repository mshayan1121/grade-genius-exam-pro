
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, FileText, BookOpen } from "lucide-react";

const ExamsManager = () => {
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch exams with course details
  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          courses(
            name,
            subjects(name),
            boards(name),
            qualifications(name),
            year_groups(name)
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch courses for the dropdown
  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          subjects(name),
          boards(name),
          qualifications(name),
          year_groups(name)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newExam: any) => {
      const { error } = await supabase
        .from('exams')
        .insert([newExam]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      resetForm();
      toast({ title: "Exam created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating exam",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: "Exam deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting exam",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setName("");
    setCourseId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !courseId) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    createMutation.mutate({
      name: name.trim(),
      course_id: courseId
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Exam
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="course">Course *</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} - {course.subjects?.name} ({course.boards?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Exam Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mid-term Assessment"
                required
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Exam"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {examsLoading ? (
            <p>Loading exams...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Year Group</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams?.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell>{exam.courses?.name}</TableCell>
                    <TableCell>{exam.courses?.subjects?.name}</TableCell>
                    <TableCell>{exam.courses?.boards?.name}</TableCell>
                    <TableCell>{exam.courses?.qualifications?.name}</TableCell>
                    <TableCell>{exam.courses?.year_groups?.name}</TableCell>
                    <TableCell>
                      {new Date(exam.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(exam.id)}
                        disabled={deleteMutation.isPending}
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

export default ExamsManager;
