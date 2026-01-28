import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { QuizQuestion } from '../types';
import {
  Trophy,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Sparkles,
  Skull,
  ShieldCheck
} from 'lucide-react';

const Quiz: React.FC = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = async (diff: 'easy' | 'hard') => {
    setDifficulty(diff);
    setLoading(true);
    setStarted(true);
    setIsFinished(false);
    setCurrentIdx(0);
    setScore(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setError(null);

    try {
      const q = await geminiService.generateQuiz(diff);
      if (!q || q.length === 0) {
        throw new Error('No questions generated');
      }
      setQuestions(q);
    } catch (err) {
      console.error(err);
      setError('Failed to load quiz. Please try again.');
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option: string) => {
    if (selectedOption) return;

    setSelectedOption(option);
    setShowExplanation(true);

    if (option === questions[currentIdx].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  /* ================= START SCREEN ================= */
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-10">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
          <Sparkles size={48} className="text-white" />
        </div>

        <h2 className="text-4xl font-black text-white uppercase italic">
          Security Awareness Challenge
        </h2>

        {error && (
          <p className="text-red-400 font-bold text-sm">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => loadQuiz('easy')}
            className="glass-panel p-8 rounded-[2.5rem] hover:scale-105 transition"
          >
            <ShieldCheck className="text-indigo-400 mb-3" />
            <h3 className="text-xl font-black text-white">Guardian Mode</h3>
            <p className="text-xs text-gray-400">Beginner friendly</p>
          </button>

          <button
            onClick={() => loadQuiz('hard')}
            className="glass-panel p-8 rounded-[2.5rem] hover:scale-105 transition"
          >
            <Skull className="text-red-400 mb-3" />
            <h3 className="text-xl font-black text-white">Architect Mode</h3>
            <p className="text-xs text-gray-400">Advanced security logic</p>
          </button>
        </div>
      </div>
    );
  }

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-indigo-500" size={64} />
        <p className="text-gray-400 mt-4 font-bold">
          Generating {difficulty.toUpperCase()} questions…
        </p>
      </div>
    );
  }

  /* ================= SAFETY CHECK ================= */
  if (!questions.length) {
    return null;
  }

  /* ================= RESULT ================= */
  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-xl mx-auto glass-panel p-10 rounded-[3rem] text-center space-y-6">
        <Trophy size={56} className="mx-auto text-indigo-400" />
        <h2 className="text-4xl font-black text-white">Evaluation Complete</h2>
        <p className="text-6xl font-black text-indigo-400">{percentage}%</p>

        <button
          onClick={() => setStarted(false)}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl"
        >
          <RotateCcw className="inline mr-2" /> Restart Quiz
        </button>
      </div>
    );
  }

  /* ================= QUESTION VIEW ================= */
  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-black">
          Question {currentIdx + 1} / {questions.length}
        </h3>
        <span className="text-indigo-400 font-black">Score: {score}</span>
      </div>

      <div className="glass-panel p-8 rounded-2xl">
        <h2 className="text-xl text-white font-bold italic">
          {currentQ.question}
        </h2>
      </div>

      <div className="space-y-4">
        {currentQ.options.map((option, idx) => {
          const isCorrect = option === currentQ.correctAnswer;
          const isSelected = option === selectedOption;

          return (
            <button
              key={idx}
              disabled={!!selectedOption}
              onClick={() => handleSelect(option)}
              className={`w-full p-5 rounded-xl border transition text-left
                ${
                  isSelected
                    ? isCorrect
                      ? 'bg-green-500/20 border-green-500'
                      : 'bg-red-500/20 border-red-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <p className="text-gray-300 italic">{currentQ.explanation}</p>
          <button
            onClick={nextQuestion}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black"
          >
            {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            <ArrowRight className="inline ml-2" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Quiz;
