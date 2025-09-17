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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
          {/* Quick Actions */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo("/chat")}
              className="text-foreground-secondary hover:text-brand-primary hidden sm:flex"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo("/dashboard")}
              className="text-foreground-secondary hover:text-brand-primary hidden sm:flex"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </motion.div>

          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full glass hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary"
                  >
                    <div className="w-8 h-8 gradient-brand rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 glass-strong border-border/50 shadow-xl"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground">
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-foreground-muted truncate">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  onClick={() => navigateTo("/dashboard")}
                  className="text-foreground hover:text-brand-primary"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigateTo("/settings")}
                  className="text-foreground hover:text-brand-primary"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-error hover:text-error focus:text-error"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </motion.header>
  );
}