import { useState } from "react";
import { generateQuiz } from "../api";
import { TrophyIcon, ThumbsUpIcon, BookOpenIcon } from "./Icons";

export default function QuizMode({ cards }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);

  async function startQuiz() {
    setLoading(true);
    setError(null);
    try {
      // Only send front/back to keep payload small
      const subset = shuffle([...cards])
        .slice(0, numQuestions)
        .map((c) => ({ front: c.front, back: c.back, category: c.category }));
      const { questions: q } = await generateQuiz(subset);
      if (!q || q.length === 0) {
        throw new Error("No questions were generated. Try again.");
      }
      setQuestions(q);
      setCurrent(0);
      setSelected(null);
      setShowExplanation(false);
      setScore(0);
      setFinished(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function handleSelect(idx) {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    if (idx === questions[current].correctIndex) {
      setScore((s) => s + 1);
    }
  }

  function nextQuestion() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
    }
  }

  if (!questions) {
    return (
      <div className="text-center space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Quiz Setup
          </h3>
          <p className="text-gray-500 mb-6">
            Claude will generate multiple-choice questions from your flashcards.
          </p>
          <label className="block text-sm text-gray-600 mb-2">
            Number of questions
          </label>
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 text-gray-700"
          >
            <option value={5}>5 questions</option>
            <option value={10}>10 questions</option>
            <option value={15}>15 questions</option>
            <option value={20}>20 questions</option>
          </select>
          <button
            onClick={startQuiz}
            disabled={loading || cards.length === 0}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Generating Quiz..." : "Start Quiz"}
          </button>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={startQuiz}
                className="mt-2 text-sm text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const ResultIcon = pct >= 80 ? TrophyIcon : pct >= 60 ? ThumbsUpIcon : BookOpenIcon;
    const iconColor = pct >= 80 ? "text-yellow-500" : pct >= 60 ? "text-green-500" : "text-indigo-500";
    return (
      <div className="text-center space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md mx-auto">
          <div className={`flex justify-center mb-4 ${iconColor}`}>
            <ResultIcon />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Quiz Complete!
          </h3>
          <p className="text-4xl font-bold text-indigo-600 mb-2">
            {score}/{questions.length}
          </p>
          <p className="text-gray-500 mb-6">{pct}% correct</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={startQuiz}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin mr-2" />Generating...</>
              ) : (
                "New Quiz"
              )}
            </button>
            <button
              onClick={() => { setQuestions(null); setFinished(false); }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          Question {current + 1} of {questions.length}
        </span>
        <span className="text-sm font-medium text-indigo-600">
          Score: {score}/{current + (selected !== null ? 1 : 0)}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all"
          style={{
            width: `${((current + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-4">
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full mb-3 inline-block">
          {q.category}
        </span>
        <p className="text-lg text-gray-800 font-medium">{q.question}</p>
      </div>

      <div className="space-y-3">
        {q.options.map((opt, idx) => {
          let classes =
            "w-full text-left p-4 rounded-xl border-2 transition-colors font-medium ";
          if (selected === null) {
            classes += "border-gray-200 hover:border-indigo-300 bg-white text-gray-700";
          } else if (idx === q.correctIndex) {
            classes += "border-green-500 bg-green-50 text-green-800";
          } else if (idx === selected) {
            classes += "border-red-500 bg-red-50 text-red-800";
          } else {
            classes += "border-gray-200 bg-gray-50 text-gray-400";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={classes}
            >
              <span className="inline-block w-7 h-7 rounded-full bg-gray-100 text-center leading-7 text-sm mr-3">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Explanation:</strong> {q.explanation}
          </p>
        </div>
      )}

      {selected !== null && (
        <div className="mt-6 text-center">
          <button
            onClick={nextQuestion}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            {current < questions.length - 1 ? "Next Question" : "See Results"}
          </button>
        </div>
      )}
    </div>
  );
}
