"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Plane,
  Radio,
  MessageSquare,
  Target,
  Zap,
  User,
  Settings,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

interface UserProfile {
  fullName: string;
  role: 'student' | 'instructor' | 'controller' | 'pilot' | 'other';
  experience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  interests: string[];
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

const WelcomeStep = ({ onNext }: { onNext: () => void }) => (
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
      <div className="w-24 h-24 gradient-brand rounded-full flex items-center justify-center shadow-brand">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
    </motion.div>

    <div className="space-y-4">
      <h1 className="text-4xl font-bold text-foreground">Welcome to AirAssist</h1>
      <p className="text-xl text-foreground-secondary max-w-2xl mx-auto">
        Your AI-powered aviation guidance companion. Let's get you set up with a personalized experience
        tailored to your aviation knowledge and goals.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {[
        {
          icon: MessageSquare,
          title: "AI Chat Assistant",
          description: "Get instant answers to aviation questions with context-aware responses"
        },
        {
          icon: BookOpen,
          title: "Knowledge Base",
          description: "Access comprehensive aviation regulations, procedures, and best practices"
        },
        {
          icon: Target,
          title: "Personalized Learning",
          description: "Tailored content based on your experience level and interests"
        }
      ].map((feature, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
          className="p-6 rounded-xl glass border border-border/30"
        >
          <feature.icon className="w-8 h-8 text-brand-primary mb-4 mx-auto" />
          <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
          <p className="text-sm text-foreground-secondary">{feature.description}</p>
        </motion.div>
      ))}
    </div>

    <Button onClick={onNext} size="lg" className="gradient-brand text-white shadow-brand">
      Get Started
      <ChevronRight className="w-5 h-5 ml-2" />
    </Button>
  </motion.div>
);

const ProfileStep = ({
  profile,
  setProfile,
  onNext,
  onBack
}: {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  onNext: () => void;
  onBack: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="space-y-8"
  >
    <div className="text-center space-y-4">
      <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center mx-auto shadow-brand">
        <User className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-foreground">Tell us about yourself</h2>
      <p className="text-foreground-secondary">
        Help us personalize your AirAssist experience
      </p>
    </div>

    <Card className="max-w-2xl mx-auto glass border-border/30">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={profile.fullName}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            placeholder="Enter your full name"
            className="glass border-border/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Your Role in Aviation</Label>
          <Select
            value={profile.role}
            onValueChange={(value: any) => setProfile({ ...profile, role: value })}
          >
            <SelectTrigger className="glass border-border/50">
              <SelectValue placeholder="Select your primary role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student Pilot</SelectItem>
              <SelectItem value="pilot">Licensed Pilot</SelectItem>
              <SelectItem value="controller">Air Traffic Controller</SelectItem>
              <SelectItem value="instructor">Flight Instructor</SelectItem>
              <SelectItem value="other">Other Aviation Professional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience">Experience Level</Label>
          <Select
            value={profile.experience}
            onValueChange={(value: any) => setProfile({ ...profile, experience: value })}
          >
            <SelectTrigger className="glass border-border/50">
              <SelectValue placeholder="Select your experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
              <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
              <SelectItem value="advanced">Advanced (5-10 years)</SelectItem>
              <SelectItem value="expert">Expert (10+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>Areas of Interest (select all that apply)</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              'IFR Procedures',
              'VFR Operations',
              'Weather Analysis',
              'Navigation',
              'Emergency Procedures',
              'Aircraft Systems',
              'Regulations (FAR/AIM)',
              'Airport Operations'
            ].map((interest) => (
              <div key={interest} className="flex items-center space-x-2">
                <Checkbox
                  id={interest}
                  checked={profile.interests.includes(interest)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setProfile({
                        ...profile,
                        interests: [...profile.interests, interest]
                      });
                    } else {
                      setProfile({
                        ...profile,
                        interests: profile.interests.filter(i => i !== interest)
                      });
                    }
                  }}
                />
                <Label htmlFor={interest} className="text-sm">
                  {interest}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="flex justify-between max-w-2xl mx-auto">
      <Button variant="outline" onClick={onBack}>
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <Button
        onClick={onNext}
        disabled={!profile.fullName || !profile.role || !profile.experience}
        className="gradient-brand text-white"
      >
        Continue
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  </motion.div>
);

const PreferencesStep = ({
  profile,
  setProfile,
  onNext,
  onBack
}: {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  onNext: () => void;
  onBack: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="space-y-8"
  >
    <div className="text-center space-y-4">
      <div className="w-16 h-16 gradient-brand rounded-full flex items-center justify-center mx-auto shadow-brand">
        <Settings className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-foreground">Customize your preferences</h2>
      <p className="text-foreground-secondary">
        Set up notifications and display preferences
      </p>
    </div>

    <Card className="max-w-2xl mx-auto glass border-border/30">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Notifications</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-sm text-foreground-secondary">
                Get notified about important updates and tips
              </p>
            </div>
            <Checkbox
              checked={profile.preferences.notifications}
              onCheckedChange={(checked) =>
                setProfile({
                  ...profile,
                  preferences: { ...profile.preferences, notifications: !!checked }
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Updates</Label>
              <p className="text-sm text-foreground-secondary">
                Receive weekly aviation insights and updates
              </p>
            </div>
            <Checkbox
              checked={profile.preferences.emailUpdates}
              onCheckedChange={(checked) =>
                setProfile({
                  ...profile,
                  preferences: { ...profile.preferences, emailUpdates: !!checked }
                })
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Appearance</h3>

          <div className="space-y-2">
            <Label>Theme Preference</Label>
            <Select
              value={profile.preferences.theme}
              onValueChange={(value: any) =>
                setProfile({
                  ...profile,
                  preferences: { ...profile.preferences, theme: value }
                })
              }
            >
              <SelectTrigger className="glass border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="flex justify-between max-w-2xl mx-auto">
      <Button variant="outline" onClick={onBack}>
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <Button onClick={onNext} className="gradient-brand text-white">
        Continue
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  </motion.div>
);

const CompletionStep = ({
  profile,
  onComplete
}: {
  profile: UserProfile;
  onComplete: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center space-y-8"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: "spring" }}
      className="flex justify-center"
    >
      <div className="w-24 h-24 gradient-brand rounded-full flex items-center justify-center shadow-brand">
        <Check className="w-12 h-12 text-white" />
      </div>
    </motion.div>

    <div className="space-y-4">
      <h2 className="text-4xl font-bold text-foreground">You're all set!</h2>
      <p className="text-xl text-foreground-secondary max-w-2xl mx-auto">
        Welcome aboard, {profile.fullName}! Your AirAssist experience has been personalized
        based on your preferences.
      </p>
    </div>

    <Card className="max-w-2xl mx-auto glass border-border/30">
      <CardContent className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Your Profile Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div>
            <p className="text-sm text-foreground-secondary">Role</p>
            <p className="font-medium capitalize">{profile.role}</p>
          </div>
          <div>
            <p className="text-sm text-foreground-secondary">Experience</p>
            <p className="font-medium capitalize">{profile.experience}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-foreground-secondary">Interests</p>
            <p className="font-medium">{profile.interests.join(', ') || 'None selected'}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Ready to start your journey?</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[
          {
            icon: MessageSquare,
            title: "Start Chatting",
            description: "Ask your first aviation question"
          },
          {
            icon: BookOpen,
            title: "Explore Knowledge",
            description: "Browse our comprehensive database"
          },
          {
            icon: Target,
            title: "Set Learning Goals",
            description: "Track your progress and achievements"
          }
        ].map((item, index) => (
          <div key={index} className="p-4 rounded-xl glass border border-border/30">
            <item.icon className="w-8 h-8 text-brand-primary mb-2 mx-auto" />
            <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
            <p className="text-xs text-foreground-secondary">{item.description}</p>
          </div>
        ))}
      </div>
    </div>

    <Button onClick={onComplete} size="lg" className="gradient-brand text-white shadow-brand">
      Enter AirAssist
      <Zap className="w-5 h-5 ml-2" />
    </Button>
  </motion.div>
);

export function OnboardingFlow() {
  const { user, updateProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [profile, setProfile] = React.useState<UserProfile>({
    fullName: user?.user_metadata?.full_name || '',
    role: 'student',
    experience: 'beginner',
    interests: [],
    preferences: {
      notifications: true,
      emailUpdates: false,
      theme: 'auto'
    }
  });

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Introduction to AirAssist',
      icon: Sparkles,
      component: WelcomeStep
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Tell us about yourself',
      icon: User,
      component: ProfileStep
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Customize your experience',
      icon: Settings,
      component: PreferencesStep
    },
    {
      id: 'complete',
      title: 'Complete',
      description: 'You\'re ready to go!',
      icon: Check,
      component: CompletionStep
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Save profile to database using AuthProvider
      const success = await updateProfile({
        full_name: profile.fullName,
        avatar_url: null,
        onboarding_completed: true,
        metadata: {
          role: profile.role,
          experience: profile.experience,
          interests: profile.interests,
          preferences: profile.preferences
        }
      });

      if (!success) {
        throw new Error('Failed to update profile');
      }

      // Track onboarding completion
      if (user?.id) {
        await analytics.trackEvent({
          userId: user.id,
          eventType: 'user_login',
          eventData: {
            onboarding_completed: true,
            role: profile.role,
            experience: profile.experience,
            interests_count: profile.interests.length
          }
        });
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-foreground">AirAssist Setup</h1>
            </div>
            <div className="text-sm text-foreground-secondary">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  index <= currentStep ? "text-brand-primary" : "text-foreground-muted"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                    index < currentStep
                      ? "bg-brand-primary text-white"
                      : index === currentStep
                      ? "bg-brand-primary text-white"
                      : "bg-surface border border-border"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <CurrentStepComponent
              key={currentStep}
              profile={profile}
              setProfile={setProfile}
              onNext={handleNext}
              onBack={handleBack}
              onComplete={handleComplete}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}