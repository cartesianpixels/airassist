"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Database, Brain, CheckCircle, Zap } from "lucide-react";

interface SearchLog {
  id: string;
  message: string;
  type: 'search' | 'embedding' | 'found' | 'processing' | 'complete';
  timestamp: number;
  details?: string;
}

interface SearchLogsIndicatorProps {
  isVisible: boolean;
  searchQuery?: string;
  onComplete?: () => void;
}

export function SearchLogsIndicator({
  isVisible,
  searchQuery = "",
  onComplete
}: SearchLogsIndicatorProps) {
  const [logs, setLogs] = React.useState<SearchLog[]>([]);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [sessionId] = React.useState(() => Math.random().toString(36).substring(2, 15));

  // Simulate the search process logs based on what we see in server logs
  const searchSteps = React.useMemo(() => [
    {
      message: `🔍 Processing query: "${searchQuery.substring(0, 40)}${searchQuery.length > 40 ? '...' : ''}"`,
      type: 'search' as const,
      delay: 500,
      details: 'Starting search workflow'
    },
    {
      message: "💸 Checking search cache...",
      type: 'search' as const,
      delay: 800,
      details: 'Cache miss - querying database'
    },
    {
      message: "🧠 Generating embedding vector...",
      type: 'embedding' as const,
      delay: 1200,
      details: 'Calling OpenAI embeddings API'
    },
    {
      message: "💰 Embedding generated successfully",
      type: 'embedding' as const,
      delay: 1800,
      details: '1536 dimensions, ~500ms'
    },
    {
      message: "🗃️ Searching knowledge base...",
      type: 'search' as const,
      delay: 2200,
      details: 'Vector similarity search'
    },
    {
      message: "📚 Found relevant documents",
      type: 'found' as const,
      delay: 2800,
      details: 'Analyzing similarity scores'
    },
    {
      message: "🎯 Smart document selection",
      type: 'processing' as const,
      delay: 3200,
      details: 'Filtering by relevance threshold'
    },
    {
      message: "📏 Building optimized context",
      type: 'processing' as const,
      delay: 3600,
      details: 'Dynamic token allocation'
    },
    {
      message: "✅ Context ready - calling AI",
      type: 'complete' as const,
      delay: 4000,
      details: 'Cost reduction: 67% vs naive approach'
    }
  ], [searchQuery]);

  // Use ref to store onComplete to avoid effect re-runs
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  React.useEffect(() => {
    if (!isVisible) {
      setLogs([]);
      setCurrentStep(0);
      return;
    }

    const timeouts: NodeJS.Timeout[] = [];

    const addLog = (step: typeof searchSteps[0], index: number) => {
      const timeout = setTimeout(() => {
        const newLog: SearchLog = {
          id: `log-${sessionId}-${index}-${Date.now()}`,
          message: step.message,
          type: step.type,
          timestamp: Date.now(),
          details: step.details
        };

        setLogs(prev => [...prev, newLog]);
        setCurrentStep(index + 1);

        // Call onComplete when finished
        if (index === searchSteps.length - 1) {
          const completeTimeout = setTimeout(() => {
            onCompleteRef.current?.();
          }, 1000);
          timeouts.push(completeTimeout);
        }
      }, step.delay);

      timeouts.push(timeout);
    };

    // Add each log with timing
    searchSteps.forEach((step, index) => {
      addLog(step, index);
    });

    // Cleanup function - clear all timeouts
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      setLogs([]);
      setCurrentStep(0);
    };
  }, [isVisible, searchSteps, sessionId]);

  const getIcon = (type: SearchLog['type']) => {
    switch (type) {
      case 'search': return <Search className="w-3 h-3" />;
      case 'embedding': return <Brain className="w-3 h-3" />;
      case 'found': return <Database className="w-3 h-3" />;
      case 'processing': return <Zap className="w-3 h-3" />;
      case 'complete': return <CheckCircle className="w-3 h-3" />;
      default: return <Search className="w-3 h-3" />;
    }
  };

  const getColor = (type: SearchLog['type']) => {
    switch (type) {
      case 'search': return 'text-blue-500';
      case 'embedding': return 'text-purple-500';
      case 'found': return 'text-green-500';
      case 'processing': return 'text-yellow-500';
      case 'complete': return 'text-emerald-500';
      default: return 'text-gray-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 w-80 z-50">
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.95 }}
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Search className="w-4 h-4 text-emerald-500" />
            </motion.div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Search Process
            </h3>
            <div className="ml-auto text-xs text-slate-500">
              {currentStep}/{searchSteps.length}
            </div>
          </div>
        </div>

        {/* Logs Container */}
        <div className="max-h-64 overflow-y-auto">
          <div className="p-3 space-y-2">
            <AnimatePresence>
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10, x: -10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05
                  }}
                  className="flex items-start gap-2 group"
                >
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    className={`mt-0.5 ${getColor(log.type)}`}
                  >
                    {getIcon(log.type)}
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 + 0.2 }}
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight"
                    >
                      {log.message}
                    </motion.div>

                    {log.details && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: index * 0.05 + 0.3 }}
                        className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight"
                      >
                        {log.details}
                      </motion.div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 + 0.4 }}
                    className="text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Progress indicator */}
            {currentStep < searchSteps.length && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-200/40 dark:border-slate-700/40"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3"
                >
                  <div className="w-full h-full border-2 border-emerald-500/30 border-t-emerald-500 rounded-full" />
                </motion.div>
                <span className="text-xs text-slate-500">
                  Processing step {currentStep + 1}...
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Progress Bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / searchSteps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}