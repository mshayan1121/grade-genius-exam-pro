
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, BookOpen, FileText } from "lucide-react";

const CoursesManager = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [qualificationId, setQualificationId] = useState("");
  const [boardId, setBoardId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [yearGroupId, setYearGroupId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch courses with exams
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses-with-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          qualifications(name),
          boards(name),
          subjects(name),
          year_groups(name),
          exams(id, name, created_at)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch all required data for dropdowns
  const { data: qualifications } = useQuery({
    queryKey: ['qualifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('qualifications').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('boards').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: yearGroups } = useQuery({
    queryKey: ['year-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('year_groups').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newCourse: any) => {
      const { error } = await supabase
        .from('courses')
        .insert([newCourse]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-with-exams'] });
      resetForm();
      toast({ title: "Course created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating course",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses-with-exams'] });
      toast({ title: "Course deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting course",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setQualificationId("");
    setBoardId("");
    setSubjectId("");
    setYearGroupId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !qualificationId || !boardId || !subjectId || !yearGroupId) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      qualification_id: qualificationId,
      board_id: boardId,
      subject_id: subjectId,
      year_group_id: yearGroupId
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qualification">Qualification *</Label>
                <Select value={qualificationId} onValueChange={setQualificationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualifications?.map((qual) => (
                      <SelectItem key={qual.id} value={qual.id}>
                        {qual.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="board">Board *</Label>
                <Select value={boardId} onValueChange={setBoardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards?.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="yearGroup">Year Group *</Label>
                <Select value={yearGroupId} onValueChange={setYearGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year group" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearGroups?.map((yearGroup) => (
                      <SelectItem key={yearGroup.id} value={yearGroup.id}>
                        {yearGroup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., GCSE Mathematics - AQA"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Course description..."
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Course"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Courses & Their Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading courses...</p>
          ) : (
            <div className="space-y-4">
              {courses?.map((course) => (
                <Card key={course.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">{course.qualifications?.name}</span> • 
                          <span className="ml-1">{course.boards?.name}</span> • 
                          <span className="ml-1">{course.subjects?.name}</span> • 
                          <span className="ml-1">{course.year_groups?.name}</span>
                        </div>
                        {course.description && (
                          <p className="text-sm text-gray-500 mt-2">{course.description}</p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(course.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">
                        Exams ({course.exams?.length || 0})
                      </span>
                    </div>
                    {course.exams && course.exams.length > 0 ? (
                      <div className="grid gap-2">
                        {course.exams.map((exam) => (
                          <div key={exam.id} className="bg-gray-50 p-3 rounded border">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{exam.name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(exam.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No exams created for this course yet</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoursesManager;
