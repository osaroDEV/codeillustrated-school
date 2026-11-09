import { describe, expect, it } from "vitest";
import { gradeQuiz, publicQuiz } from "./assessments";

const quiz = [
  { question: "A", options: ["1", "2"], correct: 0 },
  { question: "B", options: ["1", "2"], correct: 1 },
  { question: "C", options: ["1", "2", "3"], correct: 2 },
];

describe("quizzes", () => {
  it("removes the answers for the browser", () => {
    expect(JSON.stringify(publicQuiz(quiz))).not.toContain("correct");
    expect(publicQuiz(quiz)[2].options).toHaveLength(3);
  });

  it("scores out of 100, rounded down", () => {
    expect(gradeQuiz(quiz, [0, 1, 2])).toEqual({ score: 100, results: [true, true, true] });
    expect(gradeQuiz(quiz, [0, 1, 0])).toEqual({ score: 66, results: [true, true, false] });
    expect(gradeQuiz(quiz, [1, 0, 0]).score).toBe(0);
  });

  it("counts a missing answer as wrong", () => {
    expect(gradeQuiz(quiz, [0]).results).toEqual([true, false, false]);
  });
});
