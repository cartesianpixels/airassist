"use client";

import * as React from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { LoginButton } from "@/components/auth/LoginButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Users, 
  Activity, 
  DollarSign, 
  Clock,
  AlertTriangle,
  TrendingUp,
  Server,
  Database,
  ArrowLeft,
  BarChart3,
  Zap,
  Shield,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  averageSessionLength: number;
  averageMessagesPerSession: number;
}

interface DailyMetric {
  date: string;
  sessions: number;
  messages: number;
  tokens: number;
  cost: number;
  apiCalls: number;
  errors: number;
  uniqueUsers: number;
}

interface ModelUsage {
  model: string;
  usageCount: number;
  totalTokens: number;
  totalCost: number;
}

interface TierDistribution {
  [tier: string]: number;
}

function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = React.useState<AdminMetrics | null>(null);
  const [dailyMetrics, setDailyMetrics] = React.useState<DailyMetric[]>([]);
  const [modelUsage, setModelUsage] = React.useState<ModelUsage[]>([]);
  const [tierDistribution, setTierDistribution] = React.useState<TierDistribution>({});
  const [metricsLoading, setMetricsLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<string>('');

  const fetchMetrics = React.useCallback(async () => {
    try {
      setMetricsLoading(true);
      const response = await fetch('/api/admin/metrics?days=7');
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      setMetrics(data.metrics);
      setDailyMetrics(data.dailyMetrics);
      setModelUsage(data.modelUsage);
      setTierDistribution(data.tierDistribution);
      setLastUpdated(new Date(data.lastUpdated).toLocaleString());
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user) {
      fetchMetrics();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchMetrics]);

  // Show loading screen
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Loading admin panel...</p>
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
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-slate-800 dark:text-slate-200"
                >
                  Admin Access Required
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-600 dark:text-slate-400"
                >
                  Please sign in with an admin account
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <LoginButton
                  redirectTo="/admin"
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount < 0.001) return '<$0.001';
    return `$${amount.toFixed(amount < 0.01 ? 4 : 2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800 dark:text-slate-200">Admin Panel</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">System Monitoring & Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={metricsLoading}
              className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <UserMenu />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* System Status */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                System Dashboard
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Last updated: {lastUpdated || 'Loading...'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">System Online</span>
            </div>
          </div>

          {/* Key Metrics Cards */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(metrics.totalUsers)}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(metrics.activeUsers)} active
                    </p>
                    <Progress value={(metrics.activeUsers / metrics.totalUsers) * 100} className="mt-2 h-1" />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">API Usage</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(metrics.totalMessages)}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(metrics.totalTokens)} tokens
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.totalCost)}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(metrics.totalCost / Math.max(metrics.totalMessages, 1))} per message
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Performance</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(metrics.averageResponseTime)}ms</div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.errorRate.toFixed(2)}% error rate
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {/* Detailed Analytics */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Daily Metrics Chart */}
              <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Daily Activity (Last 7 Days)
                  </CardTitle>
                  <CardDescription>
                    Sessions, messages, and API usage trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dailyMetrics.map((day, index) => (
                      <div key={day.date} className="grid grid-cols-5 gap-4 items-center">
                        <div className="text-sm font-medium">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{day.sessions}</div>
                          <div className="text-xs text-slate-500">sessions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{day.messages}</div>
                          <div className="text-xs text-slate-500">messages</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{formatCurrency(day.cost)}</div>
                          <div className="text-xs text-slate-500">cost</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{day.uniqueUsers}</div>
                          <div className="text-xs text-slate-500">users</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              {/* User Tier Distribution */}
              <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Tier Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of users by subscription tier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(tierDistribution).map(([tier, count]) => {
                      const total = Object.values(tierDistribution).reduce((sum, c) => sum + c, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      
                      return (
                        <div key={tier} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={tier === 'free' ? 'secondary' : tier === 'enterprise' ? 'default' : 'outline'}>
                              {tier.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">{count} users</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="w-20 h-2" />
                            <span className="text-sm text-slate-500 w-12">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="models" className="space-y-6">
              {/* Model Usage Statistics */}
              <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Model Usage Statistics
                  </CardTitle>
                  <CardDescription>
                    AI model usage and cost breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modelUsage.map((model, index) => (
                      <div key={model.model} className="grid grid-cols-4 gap-4 items-center p-3 rounded-lg bg-slate-50/60 dark:bg-slate-700/60">
                        <div>
                          <div className="font-medium">{model.model}</div>
                          <div className="text-sm text-slate-500">AI Model</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{formatNumber(model.usageCount)}</div>
                          <div className="text-xs text-slate-500">requests</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{formatNumber(model.totalTokens)}</div>
                          <div className="text-xs text-slate-500">tokens</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{formatCurrency(model.totalCost)}</div>
                          <div className="text-xs text-slate-500">cost</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      Response Times
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Average Response Time</span>
                          <span className="font-medium">{Math.round(metrics.averageResponseTime)}ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Session Length</span>
                          <span className="font-medium">{metrics.averageSessionLength} min</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Messages per Session</span>
                          <span className="font-medium">{metrics.averageMessagesPerSession}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Error Rate</span>
                          <Badge variant={metrics.errorRate > 5 ? 'destructive' : 'secondary'}>
                            {metrics.errorRate.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">System Status</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Healthy
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Database</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Connected
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

export default function AdminPageWithAuth() {
  return (
    <AuthProvider>
      <AdminPage />
    </AuthProvider>
  );
}