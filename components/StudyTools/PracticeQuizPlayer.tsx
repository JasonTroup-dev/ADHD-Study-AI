"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  GeneratedPracticeQuiz,
  PracticeQuizQuestion,
} from "@/lib/ai/practiceQuiz";
import { cn } from "@/lib/utils";

export default function PracticeQuizPlayer({
  quiz,
  exitHref = "/study/practice-quiz",
  exitLabel = "Quiz library",
}: {
  quiz: GeneratedPracticeQuiz;
  exitHref?: string;
  exitLabel?: string;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    quiz.questions.map(() => null),
  );
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    quiz.questions.map(() => false),
  );
  const [showResults, setShowResults] = useState(false);

  function restart() {
    setAnswers(quiz.questions.map(() => null));
    setRevealed(quiz.questions.map(() => false));
    setQuestionIndex(0);
    setShowResults(false);
  }

  if (showResults) {
    const score = quiz.questions.reduce(
      (total, question, index) =>
        total + (answers[index] === question.correctChoiceIndex ? 1 : 0),
      0,
    );
    const percentage = Math.round((score / quiz.questions.length) * 100);

    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 text-center sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Trophy className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold text-slate-500">Quiz complete</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          {score} of {quiz.questions.length}
        </h2>
        <p className="mt-2 text-slate-600">{percentage}% correct</p>
        <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={restart}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button asChild>
            <Link href={exitHref}>{exitLabel}</Link>
          </Button>
        </div>
      </section>
    );
  }

  const question = quiz.questions[questionIndex];
  if (!question) return null;

  const selectedChoice = answers[questionIndex] ?? null;
  const answerIsRevealed = revealed[questionIndex] ?? false;

  function selectAnswer(choiceIndex: number) {
    if (answerIsRevealed) return;
    setAnswers((current) =>
      current.map((answer, index) =>
        index === questionIndex ? choiceIndex : answer,
      ),
    );
  }

  function continueQuiz() {
    if (!answerIsRevealed) {
      setRevealed((current) =>
        current.map((value, index) => (index === questionIndex ? true : value)),
      );
      return;
    }
    if (questionIndex === quiz.questions.length - 1) {
      setShowResults(true);
    } else {
      setQuestionIndex((index) => index + 1);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-700">
            Question {questionIndex + 1} of {quiz.questions.length}
          </span>
          <Link href={exitHref} className="font-medium text-slate-500 hover:text-slate-950">
            {exitLabel}
          </Link>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width]"
            style={{ width: `${((questionIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
            {question.topic}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 capitalize text-slate-600">
            {question.difficulty}
          </span>
        </div>
        <h2 className="mt-5 text-xl font-semibold leading-8 text-slate-950 sm:text-2xl">
          {question.question}
        </h2>

        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer choices">
          {question.choices.map((choice, choiceIndex) => (
            <AnswerChoice
              key={`${questionIndex}-${choiceIndex}`}
              choice={choice}
              choiceIndex={choiceIndex}
              question={question}
              selectedChoice={selectedChoice}
              answerIsRevealed={answerIsRevealed}
              onSelect={() => selectAnswer(choiceIndex)}
            />
          ))}
        </div>

        {answerIsRevealed ? (
          <div
            className={cn(
              "mt-5 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm leading-6",
              selectedChoice === question.correctChoiceIndex
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-950",
            )}
            role="status"
          >
            {selectedChoice === question.correctChoiceIndex ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">
                {selectedChoice === question.correctChoiceIndex ? "That’s right." : "Not quite."}
              </p>
              <p className="mt-1">{question.explanation}</p>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          className="mt-6 w-full sm:w-auto"
          disabled={selectedChoice === null}
          onClick={continueQuiz}
        >
          {answerIsRevealed
            ? questionIndex === quiz.questions.length - 1
              ? "See my score"
              : "Next question"
            : "Check answer"}
          {answerIsRevealed ? <ChevronRight aria-hidden="true" /> : null}
        </Button>
      </div>
    </section>
  );
}

function AnswerChoice({
  choice,
  choiceIndex,
  question,
  selectedChoice,
  answerIsRevealed,
  onSelect,
}: {
  choice: string;
  choiceIndex: number;
  question: PracticeQuizQuestion;
  selectedChoice: number | null;
  answerIsRevealed: boolean;
  onSelect: () => void;
}) {
  const selected = selectedChoice === choiceIndex;
  const correct = question.correctChoiceIndex === choiceIndex;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={answerIsRevealed}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left text-sm leading-6 outline-none transition focus-visible:ring-3 focus-visible:ring-blue-600/20 disabled:opacity-100",
        !answerIsRevealed && selected && "border-blue-600 bg-blue-50",
        !answerIsRevealed && !selected && "border-slate-200 bg-white hover:bg-slate-50",
        answerIsRevealed && correct && "border-emerald-300 bg-emerald-50",
        answerIsRevealed && selected && !correct && "border-red-200 bg-red-50",
        answerIsRevealed && !selected && !correct && "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600",
          answerIsRevealed && correct && "border-emerald-600 bg-emerald-600 text-white",
          answerIsRevealed && selected && !correct && "border-red-500 bg-red-500 text-white",
        )}
      >
        {answerIsRevealed && correct ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          String.fromCharCode(65 + choiceIndex)
        )}
      </span>
      <span className="pt-0.5">{choice}</span>
    </button>
  );
}
