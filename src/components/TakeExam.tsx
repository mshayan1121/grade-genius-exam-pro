
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Exam {
  id: string;
  name: string;
  course_id: string;
  course?: {
    name: string;
    qualification: string;
    board: string;
    subject: string;
  };
}

interface Question {
  id: string;
  text: string;
  image_url: string | null;
  max_marks: number;
  question_order: number;
}

interface Answer {
  text: string;
  image: File | null;
}

interface TakeExamProps {
  onBack: () => void;
}

const TakeExam = ({ onBack }: TakeExamProps) => {
  const [studentName, setStudentName] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'exam'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        *,
        course:courses(name, qualification, board, subject)
      `)
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

  const loadQuestions = async (examId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('question_order');

    if (error) {
      toast({
        title: "Error loading questions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setQuestions(data || []);
      setAnswers((data || []).map(() => ({ text: "", image: null })));
    }
  };

  const handleStartExam = () => {
    if (!studentName || !selectedExamId) {
      toast({
        title: "Missing information",
        description: "Please enter your name and select an exam.",
        variant: "destructive",
      });
      return;
    }
    
    loadQuestions(selectedExamId);
    setCurrentStep('exam');
  };

  const updateAnswer = (index: number, field: keyof Answer, value: any) => {
    const updated = [...answers];
    updated[index] = { ...updated[index], [field]: value };
    setAnswers(updated);
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

  const evaluateAnswer = async (answerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-answer', {
        body: { answerId }
      });

      if (error) {
        console.error('Evaluation error:', error);
        toast({
          title: "Evaluation failed",
          description: "AI evaluation could not be completed, but your answer was saved.",
          variant: "destructive",
        });
      } else {
        console.log('Answer evaluated successfully:', data);
      }
    } catch (error: any) {
      console.error('Evaluation error:', error);
      toast({
        title: "Evaluation failed", 
        description: "AI evaluation could not be completed, but your answer was saved.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const submittedAnswerIds: string[] = [];

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = answers[i];
        let imageUrl = null;

        if (answer.image) {
          const imagePath = `answers/${question.id}/${studentName}-${Date.now()}.jpg`;
          imageUrl = await uploadImage(answer.image, imagePath);
        }

        const { data: insertedAnswer, error } = await supabase
          .from('student_answers')
          .insert([{
            question_id: question.id,
            student_name: studentName,
            text_answer: answer.text,
            image_answer_url: imageUrl
          }])
          .select('id')
          .single();

        if (error) throw error;
        
        if (insertedAnswer) {
          submittedAnswerIds.push(insertedAnswer.id);
        }
      }

      toast({
        title: "Exam submitted successfully!",
        description: "Your answers have been submitted and AI evaluation is starting...",
      });

      // Start AI evaluation for all submitted answers
      for (const answerId of submittedAnswerIds) {
        // Don't await here to avoid blocking the UI - let evaluations run in background
        evaluateAnswer(answerId);
      }

      onBack();
    } catch (error: any) {
      toast({
        title: "Error submitting exam",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStep === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Take Exam</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Exam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="studentName">Your Name</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="exam">Select Exam</Label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} - {exam.course?.subject} ({exam.course?.board})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleStartExam} className="w-full">
                Start Exam
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setCurrentStep('select')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exam Selection
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedExam?.name}
          </h1>
          <p className="text-gray-600">Student: {studentName}</p>
          {selectedExam?.course && (
            <p className="text-gray-600">
              {selectedExam.course.subject} - {selectedExam.course.board} ({selectedExam.course.qualification})
            </p>
          )}
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle>
                  Question {question.question_order} ({question.max_marks} marks)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="whitespace-pre-wrap text-gray-800">
                  {question.text}
                </div>
                
                {question.image_url && (
                  <div>
                    <img
                      src={question.image_url}
                      alt={`Question ${question.question_order}`}
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor={`answer-${index}`}>Your Answer</Label>
                  <Textarea
                    id={`answer-${index}`}
                    value={answers[index]?.text || ""}
                    onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[120px]"
                  />
                </div>

                <div>
                  <Label htmlFor={`image-${index}`}>Upload Image (Optional)</Label>
                  <Input
                    id={`image-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => updateAnswer(index, 'image', e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a photo of your handwritten work or diagrams
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Submitting..." : "Submit Exam"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TakeExam;
