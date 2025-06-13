
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
import { Trash2, Plus } from "lucide-react";

const CoursesManager = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [qualificationId, setQualificationId] = useState("");
  const [boardId, setBoardId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [yearGroupId, setYearGroupId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all required data
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          qualifications(name),
          boards(name),
          subjects(name),
          year_groups(name)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['courses'] });
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
      queryClient.invalidateQueries({ queryKey: ['courses'] });
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
          <CardTitle>Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading courses...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Year Group</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses?.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}</TableCell>
                    <TableCell>{course.qualifications?.name}</TableCell>
                    <TableCell>{course.boards?.name}</TableCell>
                    <TableCell>{course.subjects?.name}</TableCell>
                    <TableCell>{course.year_groups?.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(course.id)}
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

export default CoursesManager;
