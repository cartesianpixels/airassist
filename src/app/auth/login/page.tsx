"use client";

import { motion } from 'framer-motion';
import { LoginButton } from '@/components/auth/LoginButton';
import { Sparkles, Shield, MessageSquare, Zap } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex justify-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            {/* Heading */}
            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-slate-800 dark:text-slate-200"
              >
                Welcome to ATC Assistant
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-600 dark:text-slate-400"
              >
                Your AI-powered aviation guidance companion
              </motion.p>
            </div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 gap-4 text-sm"
            >
              <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                <span>Persistent chat history across devices</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                <Shield className="w-5 h-5 text-cyan-500" />
                <span>Secure authentication with Google</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300">
                <Zap className="w-5 h-5 text-emerald-500" />
                <span>Real-time AI responses with knowledge base</span>
              </div>
            </motion.div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <LoginButton
                redirectTo="/dashboard"
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              />
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              By signing in, you agree to our terms of service and privacy policy
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}