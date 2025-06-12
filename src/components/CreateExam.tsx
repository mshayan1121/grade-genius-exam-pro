
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  text: string;
  image: File | null;
  maxMarks: number;
}

interface CreateExamProps {
  onBack: () => void;
}

const CreateExam = ({ onBack }: CreateExamProps) => {
  const [examData, setExamData] = useState({
    name: "",
    subject: "",
    board: "",
    qualification: "",
  });
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", image: null, maxMarks: 10 }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
      // Create exam
      const { data: examResult, error: examError } = await supabase
        .from('exams')
        .insert([examData])
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

      onBack();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Exam</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={examData.subject}
                  onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="board">Board</Label>
                <Input
                  id="board"
                  value={examData.board}
                  onChange={(e) => setExamData({ ...examData, board: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  value={examData.qualification}
                  onChange={(e) => setExamData({ ...examData, qualification: e.target.value })}
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
      </div>
    </div>
  );
};

export default CreateExam;
