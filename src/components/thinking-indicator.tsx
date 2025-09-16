"use client";

import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Brain, Zap } from "lucide-react";

export function ThinkingIndicator() {
  const thinkingMessages = [
    "Searching knowledge base...",
    "Analyzing procedures...",
    "Finding relevant regulations...",
    "Processing your question...",
    "Gathering information...",
  ];

  const [currentMessage, setCurrentMessage] = React.useState(thinkingMessages[0]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => {
        const currentIndex = thinkingMessages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % thinkingMessages.length;
        return thinkingMessages[nextIndex];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start mb-6"
    >
      <div className="flex items-start gap-3 max-w-4xl">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <Avatar className="w-8 h-8 border-2 border-emerald-200 dark:border-emerald-800">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500">
              <Sparkles className="w-4 h-4 text-white" />
            </AvatarFallback>
          </Avatar>
        </motion.div>

        <div className="flex-1">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl rounded-tl-md border border-slate-200/60 dark:border-slate-700/60 shadow-lg overflow-hidden">
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Thinking animation */}
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [-2, 2, -2],
                        opacity: [0.4, 1, 0.4]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                      className="w-2 h-2 bg-emerald-500 rounded-full"
                    />
                  ))}
                </div>

                {/* Thinking message */}
                <motion.div
                  key={currentMessage}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {currentMessage}
                  </span>
                </motion.div>
              </div>

              {/* Progress bar */}
              <motion.div
                className="mt-3 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                  animate={{
                    x: ["-100%", "100%"]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </div>

            {/* Shimmer effect */}
            <motion.div
              className="h-1 bg-gradient-to-r from-transparent via-emerald-200 dark:via-emerald-700 to-transparent"
              animate={{
                x: ["-100%", "200%"]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}