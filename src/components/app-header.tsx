"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Sparkles,
  MessageSquare,
  Settings,
  BarChart3,
  LogOut,
  User,
  Menu,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onSidebarToggle?: () => void;
  showSidebarToggle?: boolean;
  className?: string;
}

export function AppHeader({
  title,
  subtitle,
  onSidebarToggle,
  showSidebarToggle = false,
  className,
}: AppHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { isAdmin } = useAdminCheck();

  const handleLogout = async () => {
    // Add logout logic here
    router.push("/");
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "sticky top-0 z-30 px-4 py-3 glass-strong border-b border-border/50 shadow-xl",
        className
      )}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: App Logo + Title */}
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onSidebarToggle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-brand"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h1 className="font-bold text-lg text-foreground">
                {title || "AirAssist"}
              </h1>
              {subtitle && (
                <p className="text-xs text-foreground-muted">{subtitle}</p>
              )}
            </div>
          </motion.div>

          {showSidebarToggle && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                className="w-8 h-8 hover:bg-surface-hover text-foreground-muted hover:text-foreground lg:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Right: Actions + User Menu */}
        <div className="flex items-center gap-2">
          {/* Admin Button - only show for admin users */}
          {isAdmin && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('/admin')}
                className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-200/50 dark:border-red-700/50 hover:from-red-500/20 hover:to-orange-500/20 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-all duration-200"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </motion.div>
          )}

          {/* Theme Switcher */}
          <ThemeSwitcher />
        </div>
      </div>
    </motion.header>
  );
}