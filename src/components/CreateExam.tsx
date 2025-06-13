
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  text: string;
  image: File | null;
  maxMarks: number;
}

interface Course {
  id: string;
  name: string;
  qualification: {
    name: string;
  } | null;
  board: {
    name: string;
  } | null;
  subject: {
    name: string;
  } | null;
  year_group: {
    name: string;
  } | null;
}

const CreateExam = () => {
  const [examData, setExamData] = useState({
    name: "",
    courseId: "",
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", image: null, maxMarks: 10 }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        qualification:qualifications(name),
        board:boards(name),
        subject:subjects(name),
        year_group:year_groups(name)
      `)
      .order('name');

    if (error) {
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCourses(data || []);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: "", image: null, maxMarks: 10 }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleImageUpload = (index: number, file: File | null) => {
    updateQuestion(index, 'image', file);
  };

  const uploadImage = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('exam-images')
      .upload(path, file);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('exam-images')
      .getPublicUrl(path);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create exam with course_id
      const { data: examResult, error: examError } = await supabase
        .from('exams')
        .insert([{
          name: examData.name,
          course_id: examData.courseId
        }])
        .select()
        .single();

      if (examError) throw examError;

      // Upload questions with images
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        let imageUrl = null;

        if (question.image) {
          const imagePath = `questions/${examResult.id}/${i}-${Date.now()}.jpg`;
          imageUrl = await uploadImage(question.image, imagePath);
        }

        const { error: questionError } = await supabase
          .from('questions')
          .insert([{
            exam_id: examResult.id,
            text: question.text,
            image_url: imageUrl,
            max_marks: question.maxMarks,
            question_order: i + 1
          }]);

        if (questionError) throw questionError;
      }

      toast({
        title: "Exam created successfully!",
        description: `${examData.name} has been created with ${questions.length} questions.`,
      });

      // Reset form
      setExamData({ name: "", courseId: "" });
      setQuestions([{ text: "", image: null, maxMarks: 10 }]);
    } catch (error: any) {
      toast({
        title: "Error creating exam",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCourse = courses.find(c => c.id === examData.courseId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Exam</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Exam Name</Label>
                  <Input
                    id="name"
                    value={examData.name}
                    onChange={(e) => setExamData({ ...examData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="course">Course</Label>
                  <Select value={examData.courseId} onValueChange={(value) => setExamData({ ...examData, courseId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name} - {course.subject?.name} ({course.board?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCourse && (
                  <div className="text-sm text-gray-600">
                    <p><strong>Qualification:</strong> {selectedCourse.qualification?.name}</p>
                    <p><strong>Board:</strong> {selectedCourse.board?.name}</p>
                    <p><strong>Subject:</strong> {selectedCourse.subject?.name}</p>
                    <p><strong>Year Group:</strong> {selectedCourse.year_group?.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {questions.map((question, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Question {index + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`question-${index}`}>Question Text</Label>
                    <Textarea
                      id={`question-${index}`}
                      value={question.text}
                      onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                      placeholder="Enter your question here..."
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`image-${index}`}>Question Image (Optional)</Label>
                      <Input
                        id={`image-${index}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(index, e.target.files?.[0] || null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`marks-${index}`}>Maximum Marks</Label>
                      <Input
                        id={`marks-${index}`}
                        type="number"
                        value={question.maxMarks}
                        onChange={(e) => updateQuestion(index, 'maxMarks', parseInt(e.target.value) || 0)}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
              
              <Button type="submit" disabled={isLoading || !examData.courseId}>
                {isLoading ? "Creating..." : "Create Exam"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateExam;
