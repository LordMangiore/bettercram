import { useState, useMemo } from "react";
import { generateQuiz } from "../api";
import { TrophyIcon, ThumbsUpIcon, BookOpenIcon } from "./Icons";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardKey(card) {
  return (card?.front || "").slice(0, 60);
}

/**
 * FSRS-informed card selection for quizzes.
 * Prioritizes struggling cards while mixing in random ones.
 */
function selectCardsForQuiz(cards, progress, numQuestions) {
  const total = Math.min(numQuestions, cards.length);

  // For large decks, pre-filter to weak/due cards + random sample instead of scoring all
  let candidates = cards;
  if (cards.length > 500) {
    const weak = [];
    const rest = [];
    for (const card of cards) {
      const p = progress?.[cardKey(card)];
      if (!p?.fsrs || p.fsrs.lapses > 0 || p.fsrs.stability < 15 || new Date(p.fsrs.due) <= new Date()) {
        weak.push(card);
      } else {
        rest.push(card);
      }
      // Stop collecting once we have enough candidates
      if (weak.length >= total * 3) break;
    }
    // Fill with random if not enough weak cards
    const needed = Math.max(total * 2, 200) - weak.length;
    if (needed > 0 && rest.length > 0) {
      const randomSample = shuffle(rest).slice(0, needed);
      candidates = [...weak, ...randomSample];
    } else {
      candidates = weak;
    }
  }

  const scored = candidates.map((card) => {
    const key = cardKey(card);
    const p = progress?.[key];
    let priority = 1;

    if (!p || !p.fsrs) {
      priority = 2;
    } else {
      const fsrs = p.fsrs;
      priority += (fsrs.lapses || 0) * 3;
      if (fsrs.stability < 5) priority += 4;
      else if (fsrs.stability < 15) priority += 2;
      const dueDate = new Date(fsrs.due);
      const daysUntilDue = (dueDate - new Date()) / 86400000;
      if (daysUntilDue <= 0) priority += 3;
      else if (daysUntilDue <= 1) priority += 2;
      else if (daysUntilDue <= 3) priority += 1;
      if (fsrs.difficulty > 7) priority += 2;
      else if (fsrs.difficulty > 5) priority += 1;
    }

    return { card, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);

  const strugglingCount = Math.ceil(total * 0.5);
  const randomCount = total - strugglingCount;

  const struggling = scored.slice(0, strugglingCount).map((s) => s.card);
  const remaining = scored.slice(strugglingCount).map((s) => s.card);
  const randomPicks = shuffle(remaining).slice(0, randomCount);

  return shuffle([...struggling, ...randomPicks]);
}

export default function QuizMode({ cards, progress }) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizStats, setQuizStats] = useState(null);

  async function startQuiz() {
    setLoading(true);
    setError(null);
    setLoadingProgress("Selecting cards...");
    try {
      // FSRS-informed card selection
      const selectedCards = selectCardsForQuiz(cards, progress, numQuestions);

      const subset = selectedCards.map((c) => ({
        front: c.front,
        back: c.back,
        category: c.category,
      }));

      // Split into batches of 10 cards each
      const batches = [];
      for (let i = 0; i < subset.length; i += 10) {
        batches.push(subset.slice(i, i + 10));
      }

      // Reset quiz state
      setCurrent(0);
      setSelected(null);
      setShowExplanation(false);
      setScore(0);
      setFinished(false);

      // Generate first batch — block until ready
      setLoadingProgress(`Generating questions (batch 1/${batches.length})...`);
      const firstResult = await generateQuiz(batches[0]);
      if (!firstResult.questions || firstResult.questions.length === 0) {
        throw new Error("No questions were generated. Try again.");
      }

      // Show first batch immediately
      setQuestions(firstResult.questions);
      setQuizStats(firstResult.stats || { total: firstResult.questions.length, fromCache: 0, generated: firstResult.questions.length });
      setLoading(false);

      // Generate remaining batches in background
      if (batches.length > 1) {
        (async () => {
          for (let i = 1; i < batches.length; i++) {
            try {
              const batchResult = await generateQuiz(batches[i]);
              if (batchResult.questions?.length > 0) {
                setQuestions((prev) => [...prev, ...batchResult.questions]);
                setQuizStats((prev) => ({
                  total: (prev?.total || 0) + batchResult.questions.length,
                  fromCache: (prev?.fromCache || 0) + (batchResult.stats?.fromCache || 0),
                  generated: (prev?.generated || 0) + (batchResult.stats?.generated || 0),
                  cardsProcessed: (prev?.cardsProcessed || 0) + (batchResult.stats?.cardsProcessed || 0),
                }));
              }
            } catch (e) {
              console.error(`Background quiz batch ${i + 1} error:`, e);
            }
          }
        })();
      }
      return; // Already set loading=false above
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-8 md:p-10 max-w-md md:max-w-lg mx-auto">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            <i className="fa-solid fa-brain text-indigo-500 mr-2" />
            Quiz
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            AI generates questions focused on your weakest cards. Cached questions load instantly.
          </p>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
            Number of questions
          </label>
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 mb-6 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
          >
            <option value={5}>5 questions</option>
            <option value={10}>10 questions</option>
            <option value={15}>15 questions</option>
            <option value={20}>20 questions</option>
            <option value={50}>50 questions</option>
            <option value={100}>100 questions</option>
          </select>
          <button
            onClick={startQuiz}
            disabled={loading || cards.length === 0}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2" />
                {loadingProgress}
              </>
            ) : (
              "Start Quiz"
            )}
          </button>
          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={startQuiz}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:text-red-800"
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
    const ResultIcon =
      pct >= 80 ? TrophyIcon : pct >= 60 ? ThumbsUpIcon : BookOpenIcon;
    const iconColor =
      pct >= 80
        ? "text-yellow-500"
        : pct >= 60
          ? "text-green-500"
          : "text-indigo-500";
    return (
      <div className="text-center space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-8 md:p-10 max-w-md md:max-w-lg mx-auto">
          <div className={`flex justify-center mb-4 ${iconColor}`}>
            <ResultIcon />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Quiz Complete!
          </h3>
          <p className="text-4xl font-bold text-indigo-600 mb-2">
            {score}/{questions.length}
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-2">{pct}% correct</p>
          {quizStats && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              {quizStats.fromCache > 0 && (
                <span>
                  <i className="fa-solid fa-bolt text-yellow-500 mr-1" />
                  {quizStats.fromCache} from question bank
                </span>
              )}
              {quizStats.generated > 0 && (
                <span className="ml-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-indigo-400 mr-1" />
                  {quizStats.generated} newly generated
                </span>
              )}
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={startQuiz}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  Generating...
                </>
              ) : (
                "New Quiz"
              )}
            </button>
            <button
              onClick={() => {
                setQuestions(null);
                setFinished(false);
              }}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const moreLoading = current >= questions.length - 2 && questions.length < numQuestions;

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Question {current + 1} of {questions.length}
          {questions.length < numQuestions && (
            <span className="text-xs text-indigo-400 ml-2">
              <i className="fa-solid fa-spinner fa-spin mr-1" />
              loading more...
            </span>
          )}
        </span>
        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          Score: {score}/{current + (selected !== null ? 1 : 0)}
        </span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all"
          style={{
            width: `${((current + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full">
            {q.category}
          </span>
          {q.difficulty === "hard" && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
              hard
            </span>
          )}
          {q.fromCache && (
            <span className="text-xs text-gray-400" title="From question bank">
              <i className="fa-solid fa-bolt text-yellow-500" />
            </span>
          )}
        </div>
        <p className="text-lg text-gray-800 dark:text-gray-100 font-medium">{q.question}</p>
      </div>

      <div className="space-y-3">
        {q.options.map((opt, idx) => {
          let classes =
            "w-full text-left p-4 rounded-xl border-2 transition-colors font-medium ";
          if (selected === null) {
            classes +=
              "border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200";
          } else if (idx === q.correctIndex) {
            classes += "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300";
          } else if (idx === selected) {
            classes += "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300";
          } else {
            classes += "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={classes}
            >
              <span className="inline-block w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-center leading-7 text-sm mr-3">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
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
