import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowLeft, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  text: string;
  image: File | null;
  maxMarks: number;
}

interface Exam {
  id: string;
  name: string;
  created_at: string;
}

interface CreateExamProps {
  onBack?: () => void;
}

const CreateExam = ({ onBack }: CreateExamProps) => {
  const [examData, setExamData] = useState({
    name: "",
  });
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", image: null, maxMarks: 10 }
  ]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingExam, setViewingExam] = useState<string | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading exams",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setExams(data || []);
    }
  };

  const viewExam = async (examId: string, examName: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('question_order');

    if (error) {
      toast({
        title: "Error loading exam questions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setExamQuestions(data || []);
      setViewingExam(examName);
    }
  };

  const deleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (error) {
      toast({
        title: "Error deleting exam",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Exam deleted successfully",
      });
      loadExams(); // Refresh the list
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
      // Create exam without course_id
      const { data: examResult, error: examError } = await supabase
        .from('exams')
        .insert([{
          name: examData.name,
          course_id: null
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

      // Reset form and reload exams
      setExamData({ name: "" });
      setQuestions([{ text: "", image: null, maxMarks: 10 }]);
      loadExams();
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

  // If viewing an exam, show the exam details
  if (viewingExam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setViewingExam(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exams
          </Button>
          <h2 className="text-2xl font-bold">{viewingExam}</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {examQuestions.length === 0 ? (
              <p className="text-gray-500">No questions found for this exam.</p>
            ) : (
              examQuestions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle>Question {index + 1} (Max Marks: {question.max_marks})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{question.text}</p>
                    {question.image_url && (
                      <img 
                        src={question.image_url} 
                        alt={`Question ${index + 1} image`}
                        className="max-w-md h-auto rounded border"
                      />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}

      {/* Existing Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Exams</CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <p className="text-gray-500">No exams created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>{exam.name}</TableCell>
                    <TableCell>
                      {new Date(exam.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewExam(exam.id, exam.name)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteExam(exam.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
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
              
              <Button type="submit" disabled={isLoading}>
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
