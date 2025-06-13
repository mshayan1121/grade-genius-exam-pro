
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Brain, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentAnswer {
  id: string;
  student_name: string;
  text_answer: string;
  image_answer_url: string | null;
  evaluated_result: any;
  submitted_at: string;
  questions: {
    text: string;
    image_url: string | null;
    max_marks: number;
    question_order: number;
    exams: {
      name: string;
      subject: string;
    };
  };
}

interface ViewResultsProps {
  onBack: () => void;
}

const ViewResults = ({ onBack }: ViewResultsProps) => {
  const [submissions, setSubmissions] = useState<StudentAnswer[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    const { data, error } = await supabase
      .from('student_answers')
      .select(`
        *,
        questions (
          text,
          image_url,
          max_marks,
          question_order,
          exams (
            name,
            subject
          )
        )
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading submissions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubmissions(data || []);
    }
    setIsLoading(false);
  };

  const evaluateAnswer = async (answerId: string) => {
    setEvaluatingIds(prev => new Set([...prev, answerId]));
    
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-answer', {
        body: { answerId }
      });

      if (error) throw error;

      toast({
        title: "Evaluation completed!",
        description: "The answer has been evaluated by AI.",
      });

      // Reload submissions to show updated results
      loadSubmissions();
    } catch (error: any) {
      toast({
        title: "Evaluation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEvaluatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(answerId);
        return newSet;
      });
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Check if submission was recently submitted (within last 5 minutes) and might be evaluating
  const isRecentSubmission = (submittedAt: string) => {
    const submissionTime = new Date(submittedAt).getTime();
    const now = new Date().getTime();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    return submissionTime > fiveMinutesAgo;
  };

  if (selectedSubmission) {
    const evaluation = selectedSubmission.evaluated_result;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setSelectedSubmission(null)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Results
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Detailed Result</h1>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>Name:</strong> {selectedSubmission.student_name}</p>
                <p><strong>Exam:</strong> {selectedSubmission.questions.exams.name}</p>
                <p><strong>Subject:</strong> {selectedSubmission.questions.exams.subject}</p>
                <p><strong>Submitted:</strong> {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Question {selectedSubmission.questions.question_order} 
                  ({selectedSubmission.questions.max_marks} marks)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Question:</h4>
                  <div className="whitespace-pre-wrap text-gray-700">
                    {selectedSubmission.questions.text}
                  </div>
                </div>

                {selectedSubmission.questions.image_url && (
                  <div>
                    <h4 className="font-semibold mb-2">Question Image:</h4>
                    <img
                      src={selectedSubmission.questions.image_url}
                      alt="Question"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Student Answer:</h4>
                  <div className="whitespace-pre-wrap text-gray-700 p-3 bg-gray-50 rounded">
                    {selectedSubmission.text_answer}
                  </div>
                </div>

                {selectedSubmission.image_answer_url && (
                  <div>
                    <h4 className="font-semibold mb-2">Student Image:</h4>
                    <img
                      src={selectedSubmission.image_answer_url}
                      alt="Student Answer"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {evaluation ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    AI Evaluation
                    <Badge className={getScoreColor(evaluation.score || 0, selectedSubmission.questions.max_marks)}>
                      {evaluation.score || 0}/{selectedSubmission.questions.max_marks}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {evaluation.ideal_answer && (
                    <div>
                      <h4 className="font-semibold mb-2">Ideal Answer:</h4>
                      <div className="p-3 bg-green-50 rounded">{evaluation.ideal_answer}</div>
                    </div>
                  )}

                  {evaluation.correct_points && (
                    <div>
                      <h4 className="font-semibold mb-2 text-green-600">What was correct:</h4>
                      <div className="p-3 bg-green-50 rounded">{evaluation.correct_points}</div>
                    </div>
                  )}

                  {evaluation.incorrect_points && (
                    <div>
                      <h4 className="font-semibold mb-2 text-red-600">What was incorrect:</h4>
                      <div className="p-3 bg-red-50 rounded">{evaluation.incorrect_points}</div>
                    </div>
                  )}

                  {evaluation.suggestions && (
                    <div>
                      <h4 className="font-semibold mb-2 text-blue-600">Suggestions for improvement:</h4>
                      <div className="p-3 bg-blue-50 rounded">{evaluation.suggestions}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  {isRecentSubmission(selectedSubmission.submitted_at) ? (
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <Clock className="w-5 h-5 animate-spin" />
                      <p>AI evaluation in progress...</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">This submission has not been evaluated yet.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Exam Results</h1>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p>Loading results...</p>
          </div>
        )}

        {!isLoading && submissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No submissions found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {submissions.map((submission) => {
              const isEvaluating = evaluatingIds.has(submission.id);
              const isRecent = isRecentSubmission(submission.submitted_at);
              const showEvaluateButton = !submission.evaluated_result && !isEvaluating && !isRecent;
              
              return (
                <Card key={submission.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{submission.student_name}</h3>
                        <p className="text-gray-600">
                          {submission.questions.exams.name} - Question {submission.questions.question_order}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {submission.evaluated_result?.score !== undefined ? (
                          <Badge className={getScoreColor(submission.evaluated_result.score, submission.questions.max_marks)}>
                            {submission.evaluated_result.score}/{submission.questions.max_marks}
                          </Badge>
                        ) : isEvaluating ? (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin" />
                            Evaluating...
                          </Badge>
                        ) : isRecent ? (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin" />
                            Processing...
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Evaluated</Badge>
                        )}
                        
                        {showEvaluateButton && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => evaluateAnswer(submission.id)}
                            disabled={isLoading}
                          >
                            <Brain className="w-4 h-4 mr-2" />
                            Evaluate
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewResults;
