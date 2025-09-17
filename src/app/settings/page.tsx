"use client";

import * as React from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { LoginButton } from "@/components/auth/LoginButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Settings, User, Bell, Palette, Zap, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    browser: boolean;
    sessions: boolean;
  };
  preferences: {
    autoSave: boolean;
    streamingResponse: boolean;
    defaultModel: string;
    maxTokens: number;
  };
}

function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<UserSettings>({
    theme: 'auto',
    language: 'en',
    notifications: {
      email: true,
      browser: true,
      sessions: false,
    },
    preferences: {
      autoSave: true,
      streamingResponse: true,
      defaultModel: 'gpt-4o-mini',
      maxTokens: 1500,
    },
  });
  const [saving, setSaving] = React.useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Implement settings save to Supabase
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Show login screen for unauthenticated users
  if (!user) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8"
            >
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
                  Please sign in to access settings
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LoginButton
                  redirectTo="/settings"
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60"
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800 dark:text-slate-200">Settings</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Customize your experience</p>
            </div>
          </div>
          <UserMenu />
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Profile Section */}
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Manage your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">
                    {user.user_metadata?.full_name || 'User'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {user.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value: 'light' | 'dark' | 'auto') =>
                    setSettings(prev => ({ ...prev, theme: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) =>
                    setSettings(prev => ({ ...prev, language: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Control when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email notifications</Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: checked }
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="browser-notifications">Browser notifications</Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Show desktop notifications
                  </p>
                </div>
                <Switch
                  id="browser-notifications"
                  checked={settings.notifications.browser}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, browser: checked }
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="session-notifications">Session reminders</Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Remind me to continue training
                  </p>
                </div>
                <Switch
                  id="session-notifications"
                  checked={settings.notifications.sessions}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, sessions: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Preferences Section */}
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Preferences
              </CardTitle>
              <CardDescription>
                Configure AI behavior and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save conversations</Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically save your chat sessions
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={settings.preferences.autoSave}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, autoSave: checked }
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="streaming">Streaming responses</Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    See AI responses as they're generated
                  </p>
                </div>
                <Switch
                  id="streaming"
                  checked={settings.preferences.streamingResponse}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, streamingResponse: checked }
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="default-model">Default AI Model</Label>
                <Select
                  value={settings.preferences.defaultModel}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, defaultModel: value }
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-effective)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (Balanced)</SelectItem>
                    <SelectItem value="gpt-4">GPT-4 (Most Capable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-tokens">Response Length</Label>
                <Select
                  value={settings.preferences.maxTokens.toString()}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, maxTokens: parseInt(value) }
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">Short (500 tokens)</SelectItem>
                    <SelectItem value="1500">Medium (1500 tokens)</SelectItem>
                    <SelectItem value="3000">Long (3000 tokens)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SettingsPageWithAuth() {
  return (
    <AuthProvider>
      <SettingsPage />
    </AuthProvider>
  );
}