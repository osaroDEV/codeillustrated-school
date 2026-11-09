// Pure rules for quizzes. Data access is in lib/assessments-server.ts.

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export type PublicQuizQuestion = Omit<QuizQuestion, "correct">;

/** A quiz with the answers removed, safe to send to the browser. */
export function publicQuiz(questions: QuizQuestion[]): PublicQuizQuestion[] {
  return questions.map(({ question, options }) => ({ question, options }));
}

/** Score out of 100 (rounded down) and which questions were right. */
export function gradeQuiz(questions: QuizQuestion[], answers: number[]): { score: number; results: boolean[] } {
  const results = questions.map((q, i) => answers[i] === q.correct);
  const right = results.filter(Boolean).length;
  return { score: questions.length === 0 ? 0 : Math.floor((right * 100) / questions.length), results };
}
