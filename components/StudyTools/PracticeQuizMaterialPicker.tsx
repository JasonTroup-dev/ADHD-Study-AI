"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  FileCheck2,
  FileQuestionMark,
  FileText,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import type {
  GeneratedPracticeQuiz,
  PracticeQuizQuestion,
} from "@/lib/ai/practiceQuiz";
import {
  formatFileSize,
  MAX_STUDY_FILE_BYTES,
  STUDY_FILE_ACCEPT,
  SUPPORTED_STUDY_FILE_EXTENSIONS,
  SUPPORTED_STUDY_FILE_LABEL,
} from "@/lib/files/uploadConstraints";
import { uploadFormData } from "@/lib/files/uploadFormData";
import { cn } from "@/lib/utils";

type MaterialSource = "file" | "text";
type QuizResponse = (GeneratedPracticeQuiz & { id: string }) | { error: string };

type QuizClass = {
  id: string;
  name: string;
};

export default function PracticeQuizMaterialPicker({
  classes = [],
  initialClassId = "",
}: {
  classes?: QuizClass[];
  initialClassId?: string;
}) {
  const router = useRouter();
  const [source, setSource] = useState<MaterialSource>("file");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<GeneratedPracticeQuiz | null>(null);
  const [classId, setClassId] = useState(initialClassId);

  function chooseSource(nextSource: MaterialSource) {
    setSource(nextSource);
    setError(null);
  }

  function updateSourceFile(file: File | null) {
    if (!file) return;

    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (
      !SUPPORTED_STUDY_FILE_EXTENSIONS.includes(
        extension as (typeof SUPPORTED_STUDY_FILE_EXTENSIONS)[number],
      )
    ) {
      setSourceFile(null);
      setError(`Choose a supported file: ${SUPPORTED_STUDY_FILE_LABEL}.`);
      return;
    }

    if (file.size > MAX_STUDY_FILE_BYTES) {
      setSourceFile(null);
      setError(
        `Choose a file ${formatFileSize(MAX_STUDY_FILE_BYTES)} or smaller.`,
      );
      return;
    }

    setSourceFile(file);
    setError(null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    updateSourceFile(event.dataTransfer.files[0] ?? null);
  }

  async function createQuiz() {
    if (isGenerating) return;

    const formData = new FormData();
    if (source === "file" && sourceFile) {
      formData.append("file", sourceFile);
    } else if (source === "text" && notes.trim()) {
      formData.append("text", notes);
    } else {
      setError("Upload a document or paste your study material.");
      return;
    }
    if (classId) formData.append("classId", classId);

    setError(null);
    setIsGenerating(true);

    try {
      const response = await uploadFormData<QuizResponse>(
        "/api/practice-quiz/generate",
        formData,
      );

      if (!response.ok || !response.data || "error" in response.data) {
        setError(
          response.data && "error" in response.data
            ? response.data.error
            : "Could not create the quiz. Please try again.",
        );
        return;
      }

      setQuiz(response.data);
      router.push(`/study/practice-quiz/${response.data.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "Quiz generation was canceled."
          : "The quiz request could not be completed. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function startOver() {
    setQuiz(null);
    setError(null);
  }

  const materialIsReady =
    source === "file" ? Boolean(sourceFile) : notes.trim().length > 0;

  return (
    <div className="min-h-full flex-1 bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/study"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Study Tools
        </Link>

        <header className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <FileQuestionMark className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {quiz ? quiz.title : "What do you want to practice?"}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {quiz
                ? "Work through one question at a time and get feedback as you go."
                : "Add the material you have. We’ll organize it and turn it into a focused quiz."}
            </p>
          </div>
        </header>

        <main className="mt-8 max-w-3xl">
          {quiz ? (
            <QuizPlayer quiz={quiz} onStartOver={startOver} />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <h2 className="text-lg font-semibold text-slate-950">
                  Choose your material
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload a document or paste text—whichever is easier.
                </p>

                <div
                  className="mt-5 grid gap-3 sm:grid-cols-2"
                  role="group"
                  aria-label="Material source"
                >
                  <SourceButton
                    active={source === "file"}
                    icon={FileText}
                    title="Upload a document"
                    description="Use notes, slides, or a reading"
                    onClick={() => chooseSource("file")}
                  />
                  <SourceButton
                    active={source === "text"}
                    icon={ClipboardPaste}
                    title="Paste your notes"
                    description="Add text from any source"
                    onClick={() => chooseSource("text")}
                  />
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div className="mb-5">
                  <label
                    htmlFor="practice-quiz-class"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Class
                  </label>
                  <select
                    id="practice-quiz-class"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15"
                  >
                    <option value="">No class</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Link this quiz to a class so it stays organized.
                  </p>
                </div>
                {source === "file" ? (
                  <div>
                    <input
                      id="practice-quiz-material"
                      type="file"
                      accept={STUDY_FILE_ACCEPT}
                      className="sr-only"
                      onChange={(event) => {
                        updateSourceFile(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />

                    {sourceFile ? (
                      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/60 px-6 py-8 text-center">
                        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                          <FileCheck2 className="size-7" aria-hidden="true" />
                        </span>
                        <p className="mt-4 max-w-full break-all font-semibold text-slate-950">
                          {sourceFile.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatUploadSize(sourceFile.size)} · Ready to use
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          <Button
                            asChild
                            variant="outline"
                            className="rounded-xl bg-white"
                          >
                            <label
                              htmlFor="practice-quiz-material"
                              className="cursor-pointer"
                            >
                              <Upload aria-hidden="true" />
                              Replace file
                            </label>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-xl text-slate-600"
                            onClick={() => setSourceFile(null)}
                          >
                            <X aria-hidden="true" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="practice-quiz-material"
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={cn(
                          "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                          isDragging
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-300 bg-slate-50 hover:border-blue-600 hover:bg-blue-50/60",
                        )}
                      >
                        <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-blue-600">
                          <Upload className="size-6" aria-hidden="true" />
                        </span>
                        <span className="mt-4 font-semibold text-slate-950">
                          Drop your study material here
                        </span>
                        <span className="mt-1 text-sm text-slate-500">
                          or click to browse
                        </span>
                        <span className="mt-5 text-xs leading-5 text-slate-400">
                          {SUPPORTED_STUDY_FILE_LABEL}
                          <br />
                          Up to {formatFileSize(MAX_STUDY_FILE_BYTES)}
                        </span>
                      </label>
                    )}
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="practice-quiz-notes"
                      className="text-sm font-semibold text-slate-900"
                    >
                      Paste your study material
                    </label>
                    <textarea
                      id="practice-quiz-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Paste or type your notes here…"
                      className="mt-4 min-h-64 w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-3 focus:ring-blue-600/15"
                    />
                    <p className="mt-2 text-right text-xs text-slate-400">
                      {notes.trim().length.toLocaleString()} characters
                    </p>
                  </div>
                )}

                {error ? (
                  <p
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <Button
                  type="button"
                  size="lg"
                  className="mt-5 w-full rounded-xl"
                  disabled={!materialIsReady || isGenerating}
                  onClick={createQuiz}
                >
                  {isGenerating ? (
                    <>
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                      Organizing your material…
                    </>
                  ) : (
                    <>
                      <Sparkles aria-hidden="true" />
                      Create my quiz
                    </>
                  )}
                </Button>
                {isGenerating ? (
                  <p
                    className="mt-3 text-center text-sm text-slate-500"
                    role="status"
                    aria-live="polite"
                  >
                    Finding the key ideas and balancing your questions. This may
                    take a minute for longer material.
                  </p>
                ) : null}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function QuizPlayer({
  quiz,
  onStartOver,
}: {
  quiz: GeneratedPracticeQuiz;
  onStartOver: () => void;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    quiz.questions.map(() => null),
  );
  const [revealedAnswers, setRevealedAnswers] = useState<boolean[]>(() =>
    quiz.questions.map(() => false),
  );
  const [showResults, setShowResults] = useState(false);
  const question = quiz.questions[questionIndex];
  const selectedChoice = answers[questionIndex] ?? null;
  const answerIsRevealed = revealedAnswers[questionIndex] ?? false;

  if (showResults) {
    const score = quiz.questions.reduce(
      (correctAnswers, quizQuestion, index) =>
        correctAnswers +
        (answers[index] === quizQuestion.correctChoiceIndex ? 1 : 0),
      0,
    );
    const percentage = Math.round((score / quiz.questions.length) * 100);

    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 text-center sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Trophy className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold text-slate-500">Quiz complete</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          {score} of {quiz.questions.length}
        </h2>
        <p className="mt-2 text-base text-slate-600">{percentage}% correct</p>
        <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAnswers(quiz.questions.map(() => null));
              setRevealedAnswers(quiz.questions.map(() => false));
              setQuestionIndex(0);
              setShowResults(false);
            }}
          >
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button type="button" onClick={onStartOver}>
            Use different material
          </Button>
        </div>
      </section>
    );
  }

  if (!question) return null;

  function chooseAnswer(choiceIndex: number) {
    if (answerIsRevealed) return;
    setAnswers((currentAnswers) =>
      currentAnswers.map((answer, index) =>
        index === questionIndex ? choiceIndex : answer,
      ),
    );
  }

  function revealAnswer() {
    if (selectedChoice === null) return;
    setRevealedAnswers((currentAnswers) =>
      currentAnswers.map((isRevealed, index) =>
        index === questionIndex ? true : isRevealed,
      ),
    );
  }

  function continueQuiz() {
    if (questionIndex === quiz.questions.length - 1) {
      setShowResults(true);
      return;
    }
    setQuestionIndex((currentIndex) => currentIndex + 1);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-700">
            Question {questionIndex + 1} of {quiz.questions.length}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onStartOver}>
            New material
          </Button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width]"
            style={{
              width: `${((questionIndex + 1) / quiz.questions.length) * 100}%`,
            }}
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
              onSelect={() => chooseAnswer(choiceIndex)}
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
            aria-live="polite"
          >
            {selectedChoice === question.correctChoiceIndex ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            ) : (
              <XCircle
                className="mt-0.5 size-5 shrink-0 text-amber-700"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-semibold">
                {selectedChoice === question.correctChoiceIndex
                  ? "That’s right."
                  : "Not quite."}
              </p>
              <p className="mt-1">{question.explanation}</p>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          className="mt-6 w-full sm:w-auto"
          disabled={selectedChoice === null}
          onClick={answerIsRevealed ? continueQuiz : revealAnswer}
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
  const isSelected = selectedChoice === choiceIndex;
  const isCorrect = question.correctChoiceIndex === choiceIndex;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      disabled={answerIsRevealed}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left text-sm leading-6 outline-none transition focus-visible:ring-3 focus-visible:ring-blue-600/20 disabled:opacity-100",
        !answerIsRevealed && isSelected && "border-blue-600 bg-blue-50",
        !answerIsRevealed &&
          !isSelected &&
          "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        answerIsRevealed && isCorrect && "border-emerald-300 bg-emerald-50",
        answerIsRevealed && isSelected && !isCorrect && "border-red-200 bg-red-50",
        answerIsRevealed &&
          !isSelected &&
          !isCorrect &&
          "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          isSelected
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-300 bg-white text-slate-600",
          answerIsRevealed &&
            isCorrect &&
            "border-emerald-600 bg-emerald-600 text-white",
          answerIsRevealed &&
            isSelected &&
            !isCorrect &&
            "border-red-500 bg-red-500 text-white",
        )}
      >
        {answerIsRevealed && isCorrect ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          String.fromCharCode(65 + choiceIndex)
        )}
      </span>
      <span className="pt-0.5">{choice}</span>
    </button>
  );
}

function SourceButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof FileText;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex items-start gap-3 rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-3 focus-visible:ring-blue-600/25",
        active
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
      {active ? (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-blue-600 text-white">
          <Check className="size-3.5" aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}

function formatUploadSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
