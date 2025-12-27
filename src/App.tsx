import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Play,
  ChevronRight,
  CheckCircle2,
  XCircle,
  History as HistoryIcon,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  LogOut,
  AlertTriangle
} from 'lucide-react';

// --- Constants ---
const TOTAL_TIME_SECONDS = 60 * 60; // 60 phút
const PRAISES = ["Correct!", "Awesome! You did it!", "Nailed it!", "Wonderful!"];

// --- Types ---

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  originalIndex: number;
  text: string;
  options: Option[];
  isMultipleChoice: boolean;
}

interface UserAnswer {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
}

interface QuizSession {
  id: string;
  date: string;
  questions: Question[];
  userAnswers: UserAnswer[];
  score: number;
  totalQuestions: number;
  status: 'Passed' | 'Failed';
  timeSpent?: number;
}

// --- Utilities ---

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Improved Parser to handle multi-line question text and varied markdown formatting
 */
const parseMarkdown = (text: string): Question[] => {
  const questions: Question[] = [];
  const normalizedText = '\n' + text.replace(/\r\n/g, '\n');
  const questionBlocks = normalizedText.split(/\n+(?=(?:###\s+)?\*\*Question \d+[:*]*\*\*)/i);

  questionBlocks.forEach((block, idx) => {
    const lines = block.trim().split('\n');
    if (lines.length < 2) return;

    // 1. Extract Question Header and Initial Content
    const headerLine = lines[0];
    const headerMatch = headerLine.match(/^(?:###\s+)?\*\*(Question (\d+))[:*]*\*\*\s*(.*)/i);
    if (!headerMatch) return;

    const qNum = parseInt(headerMatch[2]);
    const qContentLines: string[] = [];
    if (headerMatch[3].trim()) {
      qContentLines.push(headerMatch[3].trim());
    }

    const options: Option[] = [];
    let parsingOptions = false;

    // 2. Collect all lines until we hit the first option, then collect options
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Stop if we hit what looks like a new question (safety fallback)
      if (line.match(/^(?:###\s+)?\*\*Question \d+/i)) break;

      const optionMatch = line.match(/^(\*\*|)([a-z])\.\s*(.*)/i);

      if (optionMatch) {
        parsingOptions = true;
        const hasLeadingStars = optionMatch[1] === '**';
        const letter = optionMatch[2];
        const content = optionMatch[3].trim();
        const isCorrect = hasLeadingStars || (content.startsWith('**') && content.endsWith('**'));

        let cleanContent = content;
        if (cleanContent.endsWith('**')) cleanContent = cleanContent.slice(0, -2).trim();
        if (cleanContent.startsWith('**')) cleanContent = cleanContent.slice(2).trim();

        options.push({
          id: `${letter}-${idx}-${i}`,
          text: cleanContent,
          isCorrect: isCorrect
        });
      } else if (!parsingOptions) {
        // Line is part of the question text body
        qContentLines.push(line);
      }
    }

    if (options.length >= 2) {
      const correctCount = options.filter(o => o.isCorrect).length;
      questions.push({
        id: `q-${idx}-${Date.now()}-${Math.random()}`,
        originalIndex: qNum || idx,
        text: qContentLines.join(' '),
        options: shuffleArray(options),
        isMultipleChoice: correctCount > 1
      });
    }
  });

  return questions;
};

// --- Main Component ---

export default function App() {
  const [view, setView] = useState<'HOME' | 'QUIZ' | 'SUMMARY' | 'REVIEW' | 'HISTORY'>('HOME');
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [currentSession, setCurrentSession] = useState<QuizSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [praiseMessage, setPraiseMessage] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const finalizeQuiz = () => {
    setCurrentSession(prev => {
      if (!prev) return null;
      const correctCount = prev.userAnswers.filter(a => a.isCorrect).length;
      const scorePercent = (correctCount / prev.totalQuestions) * 100;
      const finalSession: QuizSession = {
        ...prev,
        score: Math.round(scorePercent),
        status: scorePercent >= 80 ? 'Passed' : 'Failed',
        timeSpent: TOTAL_TIME_SECONDS - timeLeft
      };
      saveHistory(finalSession);
      return finalSession;
    });
    setView('SUMMARY');
  };

  const handleTimeOut = () => {
    if (view !== 'QUIZ') return;
    finalizeQuiz();
  };

  // FIX: Use lazy initializer to avoid cascading renders warning
  const [history, setHistory] = useState<QuizSession[]>(() => {
    try {
      const saved = localStorage.getItem('mcq_quiz_history_v4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (view === 'QUIZ') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view]);



  const saveHistory = (session: QuizSession) => {
    setHistory(prev => {
      const newHistory = [session, ...prev].slice(0, 50);
      localStorage.setItem('mcq_quiz_history_v4', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseMarkdown(text);
      if (parsed.length === 0) {
        alert("Không tìm thấy câu hỏi hợp lệ! Hãy kiểm tra định dạng file Markdown.");
        return;
      }
      setQuestionBank(parsed);
    };
    reader.readAsText(file);
  };

  const startQuiz = (bank: Question[] = questionBank) => {
    const shuffledBank = shuffleArray(bank);
    const selectedQuestions = shuffledBank.slice(0, Math.min(bank.length, 40));

    const newSession: QuizSession = {
      id: `session-${Date.now()}`,
      date: new Date().toLocaleString(),
      questions: selectedQuestions,
      userAnswers: [],
      score: 0,
      totalQuestions: selectedQuestions.length,
      status: 'Failed'
    };
    setCurrentSession(newSession);
    setCurrentIndex(0);
    setSelectedIds([]);
    setIsAnswered(false);
    setPraiseMessage(null);
    setShowExitConfirm(false);
    setTimeLeft(TOTAL_TIME_SECONDS);
    setView('QUIZ');
  };



  const handleOptionToggle = (id: string) => {
    if (isAnswered) return;
    const question = currentSession!.questions[currentIndex];
    if (question.isMultipleChoice) {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  const submitAnswer = () => {
    if (selectedIds.length === 0) return;

    const question = currentSession!.questions[currentIndex];
    const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id);
    const isCorrect = selectedIds.length === correctIds.length && selectedIds.every(id => correctIds.includes(id));

    if (isCorrect) {
      const randomPraise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
      setPraiseMessage(randomPraise);
    } else {
      setPraiseMessage(null);
    }

    setIsAnswered(true);
  };

  const nextQuestion = () => {
    const question = currentSession!.questions[currentIndex];
    const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id);
    const isCorrect = selectedIds.length === correctIds.length && selectedIds.every(id => correctIds.includes(id));

    const newUserAnswer: UserAnswer = {
      questionId: question.id,
      selectedOptionIds: selectedIds,
      isCorrect
    };

    const updatedSession = {
      ...currentSession!,
      userAnswers: [...currentSession!.userAnswers, newUserAnswer]
    };
    setCurrentSession(updatedSession);

    if (currentIndex < currentSession!.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedIds([]);
      setIsAnswered(false);
      setPraiseMessage(null);
    } else {
      finalizeQuiz();
    }
  };

  const handleExitQuiz = () => {
    setShowExitConfirm(false);
    setView('HOME');
    setCurrentSession(null);
  };

  // --- Render Views ---

  if (view === 'HOME') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-5 border border-slate-100">
          <div className="flex justify-center mb-3 text-indigo-600">
            <FileText size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-black text-center text-slate-800 mb-1 tracking-tight">Quiz Mastery</h1>
          <p className="text-slate-400 text-center mb-5 text-[10px] px-2 uppercase font-bold tracking-widest">
            60 MINS • 40 QUES • 80% TO PASS
          </p>

          <div className="space-y-2.5">
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
              <Upload className="w-5 h-5 text-slate-400 mb-1 group-hover:text-indigo-500" />
              <p className="text-[10px] text-slate-600 font-bold uppercase">Upload .md file</p>
              <input type="file" className="hidden" accept=".md" onChange={handleFileUpload} />
            </label>

            {questionBank.length > 0 && (
              <button
                onClick={() => startQuiz()}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2"
              >
                <Play className="fill-current" size={14} /> Start Now ({questionBank.length})
              </button>
            )}

            {history.length > 0 && (
              <button
                onClick={() => setView('HISTORY')}
                className="w-full border border-slate-200 text-slate-600 py-3 rounded-lg font-bold text-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
              >
                <HistoryIcon size={16} /> View History
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'QUIZ' && currentSession) {
    const question = currentSession.questions[currentIndex];
    const progress = ((currentIndex + 1) / currentSession.totalQuestions) * 100;
    const isTimeUrgent = timeLeft < 300;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-2.5 md:p-5">
        <div className="max-w-xl w-full mx-auto">
          {/* Header */}
          <div className="mb-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-indigo-600 font-black text-[9px] tracking-widest uppercase">
                  Q {question.originalIndex} • {currentIndex + 1} / {currentSession.totalQuestions}
                </span>
                <span className="text-slate-400 text-[8px] font-bold uppercase">
                  {question.isMultipleChoice ? 'Multiple Selection' : 'Single Selection'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors font-bold text-[9px] uppercase border border-rose-200"
                >
                  <LogOut size={10} />
                  <span>Exit</span>
                </button>

                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-bold shadow-sm border ${isTimeUrgent ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                  <Clock size={12} />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Compact Question Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3.5 md:p-5 mb-3">
            <h2 className="text-sm md:text-base font-bold text-slate-800 leading-snug mb-4">
              {question.text}
            </h2>

            <div className="space-y-2">
              {question.options.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                let containerClass = "border-slate-50 hover:border-indigo-100";
                if (isSelected) containerClass = "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400";
                if (isAnswered) {
                  if (opt.isCorrect) containerClass = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500";
                  else if (isSelected) containerClass = "border-rose-500 bg-rose-50 ring-1 ring-rose-500";
                  else containerClass = "border-slate-50 opacity-40 grayscale";
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionToggle(opt.id)}
                    disabled={isAnswered}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 ${containerClass}`}
                  >
                    <div className={`w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center border-2 ${question.isMultipleChoice ? 'rounded-sm' : 'rounded-full'
                      } ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                      {isSelected && <div className="w-1 h-1 bg-white rounded-full" />}
                    </div>
                    <span className={`font-semibold text-[13px] leading-tight ${isAnswered && opt.isCorrect ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {opt.text}
                    </span>
                    {isAnswered && opt.isCorrect && <CheckCircle2 className="ml-auto text-emerald-600 flex-shrink-0" size={14} />}
                    {isAnswered && isSelected && !opt.isCorrect && <XCircle className="ml-auto text-rose-600 flex-shrink-0" size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Praise Box */}
          {isAnswered && praiseMessage && (
            <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
              <Sparkles className="text-emerald-600 flex-shrink-0" size={12} />
              <span className="text-emerald-700 font-bold text-[11px] tracking-tight">{praiseMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            {!isAnswered ? (
              <button
                onClick={submitAnswer}
                disabled={selectedIds.length === 0}
                className="flex-1 bg-slate-800 text-white py-2.5 rounded-lg font-bold text-sm disabled:opacity-30 shadow-md transition-all active:scale-[0.98]"
              >
                Confirm
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-1 shadow-md transition-all active:scale-[0.98]"
              >
                {currentIndex === currentSession.totalQuestions - 1 ? 'Finish Quiz' : 'Next Question'} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-center mb-3 text-rose-500">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-base font-black text-center text-slate-800 mb-1 uppercase tracking-tight">Exit Quiz?</h3>
              <p className="text-slate-500 text-center text-[11px] mb-5 leading-relaxed">
                Are you sure you want to end this session? All progress for this current quiz will be lost.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleExitQuiz}
                  className="w-full bg-rose-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-rose-600 transition-colors"
                >
                  Yes, Exit Now
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
                >
                  Keep Playing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'SUMMARY' && currentSession) {
    const isPassed = currentSession.status === 'Passed';
    const minsSpent = Math.floor((currentSession.timeSpent || 0) / 60);
    const secsSpent = (currentSession.timeSpent || 0) % 60;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-xs w-full bg-white rounded-xl shadow-xl p-6 border border-slate-100">
          <div className={`inline-flex p-3 rounded-full mb-3 ${isPassed ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
            {isPassed ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
          </div>
          <h2 className={`text-2xl font-black mb-1 uppercase tracking-tighter ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currentSession.status}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-5 tracking-widest">Score: {currentSession.score}%</p>

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5 tracking-tight">Correct</p>
              <p className="text-lg font-black text-slate-800">{currentSession.userAnswers.filter(a => a.isCorrect).length}/{currentSession.totalQuestions}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5 tracking-tight">Time</p>
              <p className="text-lg font-black text-slate-800">{minsSpent}m {secsSpent}s</p>
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => setView('REVIEW')} className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider">Review Quiz</button>
            <button onClick={() => setView('HOME')} className="w-full border border-slate-200 text-slate-500 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider">Home</button>

            <div className="pt-4 border-t mt-4">
              <div className="flex gap-2">
                <button onClick={() => startQuiz()} className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-md font-bold text-[10px] uppercase hover:bg-indigo-100">Retry</button>
                <label className="flex-1 bg-white border border-indigo-100 text-indigo-600 py-2 rounded-md font-bold text-[10px] cursor-pointer text-center uppercase hover:bg-indigo-50 transition-colors">
                  New File
                  <input type="file" className="hidden" accept=".md" onChange={(e) => { handleFileUpload(e); setView('HOME'); }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'REVIEW' && currentSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-3 md:p-5">
        <div className="max-w-xl w-full mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setView('SUMMARY')} className="p-1.5 bg-white rounded-lg border border-slate-200"><ChevronRight className="rotate-180" size={18} /></button>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Review Details</h2>
          </div>
          <div className="space-y-3 mb-8">
            {currentSession.questions.map((q, qIdx) => {
              const userAnswer = currentSession.userAnswers.find(a => a.questionId === q.id);
              return (
                <div key={q.id} className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                  <div className={`p-2 flex items-center justify-between ${userAnswer?.isCorrect ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <span className={`text-[9px] font-black uppercase ${userAnswer?.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>Q {q.originalIndex} • Question {qIdx + 1}</span>
                    {userAnswer ? (
                      userAnswer.isCorrect ? <CheckCircle2 className="text-emerald-600" size={14} /> : <XCircle className="text-rose-600" size={14} />
                    ) : (
                      <span className="text-rose-600 text-[8px] font-bold uppercase">Unanswered</span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-bold text-slate-800 mb-3 leading-snug">{q.text}</p>
                    <div className="space-y-1">
                      {q.options.map(opt => {
                        const isSelectedByPlayer = userAnswer?.selectedOptionIds.includes(opt.id);
                        let style = "border-slate-50 bg-white text-slate-400";
                        if (opt.isCorrect) style = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold";
                        else if (isSelectedByPlayer) style = "border-rose-500 bg-rose-50 text-rose-800 font-bold";

                        return (
                          <div key={opt.id} className={`p-2 rounded border flex items-center gap-2 text-[12px] ${style}`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.isCorrect ? 'bg-emerald-500' : isSelectedByPlayer ? 'bg-rose-500' : 'bg-slate-200'}`} />
                            <span className="flex-1 leading-tight">{opt.text}</span>
                            {opt.isCorrect && <span className="text-[7px] bg-emerald-600 text-white px-1 py-0.5 rounded font-black uppercase flex-shrink-0">Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => setView('SUMMARY')} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-black text-sm mb-10 shadow-md hover:bg-indigo-700">Back to Summary</button>
        </div>
      </div>
    );
  }

  if (view === 'HISTORY') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-4">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('HOME')} className="p-1.5 bg-white rounded-lg border border-slate-200"><ChevronRight className="rotate-180" size={18} /></button>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Exam Records</h2>
            </div>
            <button onClick={() => { if (window.confirm("Clear all history?")) { setHistory([]); localStorage.removeItem('mcq_quiz_history_v4'); } }} className="text-rose-500 p-1.5"><Trash2 size={18} /></button>
          </div>
          <div className="space-y-2.5">
            {history.map((session) => (
              <button key={session.id} onClick={() => { setCurrentSession(session); setView('SUMMARY'); }} className="w-full bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all text-left group">
                <div>
                  <p className="text-slate-400 text-[8px] font-black uppercase mb-0.5 tracking-widest">{session.date}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-800">{session.score}%</span>
                    <span className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${session.status === 'Passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{session.status}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}