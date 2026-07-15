/**
 * frontend/src/features/onboarding/config/steps.ts
 * Step definitions for the onboarding tour.
 * Uses data-onboarding attributes to locate DOM elements.
 * On mobile, falls back to mobileTarget selectors for bottom nav items.
 */

import type { OnboardingStep } from '../types';

export function getStepTargetSelector(step: OnboardingStep, isMobile: boolean): string {
  if (isMobile && step.mobileTarget) {
    return step.mobileTarget;
  }

  return step.target;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'dashboard',
    target: '[data-onboarding="dashboard"]',
    title: 'Dashboard',
    description:
      'This is your command center. Everything important appears here — your daily schedule, upcoming tasks, and productivity insights at a glance.',
    position: 'right',
    route: '/',
  },
  {
    id: 'tasks',
    target: '[data-onboarding="tasks"]',
    mobileTarget: '[data-onboarding-mobile="tasks"]',
    title: 'Tasks',
    description:
      'Organise everything you need to accomplish. Manage tasks with priorities, due dates, subtasks, and our advanced workflow.',
    position: 'right',
    route: '/tasks',
  },
  {
    id: 'planner',
    target: '[data-onboarding="planner"]',
    mobileTarget: '[data-onboarding-mobile="planner"]',
    title: 'Planner',
    description:
      'Plan your week ahead with the smart planner. Drag and drop tasks onto your schedule for optimal time blocking.',
    position: 'right',
    route: '/planner',
  },
  {
    id: 'calendar',
    target: '[data-onboarding="calendar"]',
    mobileTarget: '[data-onboarding-mobile="calendar"]',
    title: 'Calendar',
    description:
      'Keep your work and schedule perfectly aligned. View tasks, focus sessions, and Google Calendar events in one unified view.',
    position: 'right',
    route: '/calendar',
  },
  {
    id: 'habits',
    target: '[data-onboarding="habits"]',
    mobileTarget: '[data-onboarding-mobile="habits"]',
    title: 'Habits & Goals',
    description:
      'Build streaks and track daily habits. Small consistent actions compound into extraordinary results over time.',
    position: 'right',
    route: '/habits',
  },
  {
    id: 'notes',
    target: '[data-onboarding="notes"]',
    mobileTarget: '[data-onboarding-mobile="notes"]',
    title: 'Notes',
    description:
      'Capture ideas, journal entries, and meeting notes — all connected to your tasks and projects for seamless context.',
    position: 'right',
    route: '/notes',
  },
  {
    id: 'settings',
    target: '[data-onboarding="settings"]',
    mobileTarget: '[data-onboarding-mobile="settings"]',
    title: 'Settings',
    description:
      'Open the control room for your workspace preferences. We will step into each settings section next, starting with the visual experience and then moving through alerts, integrations, and security.',
    position: 'right',
    route: '/settings',
  },
  {
    id: 'settings-appearance',
    target: '[data-onboarding="settings-appearance"]',
    mobileTarget: '[data-onboarding="settings-appearance"]',
    title: 'Appearance',
    description:
      'This section governs the feel of the entire product. Theme, layout density, and calendar view all live together here so you can tune the workspace in one pass.',
    position: 'right',
    route: '/settings?tab=appearance',
  },
  {
    id: 'settings-theme',
    target: '[data-onboarding="settings-theme"]',
    mobileTarget: '[data-onboarding="settings-theme"]',
    title: 'Theme',
    description:
      'Choose the visual mode that fits your environment. Light, Dark, and System all update instantly without a page refresh.',
    position: 'right',
    route: '/settings?tab=appearance',
  },
  {
    id: 'settings-layout',
    target: '[data-onboarding="settings-layout"]',
    mobileTarget: '[data-onboarding="settings-layout"]',
    title: 'Layout Density',
    description:
      'Use Compact when you want more information on screen, Comfortable for balance, or Expanded for a spacious executive-style layout.',
    position: 'right',
    route: '/settings?tab=appearance',
  },
  {
    id: 'settings-notifications',
    target: '[data-onboarding="settings-notifications"]',
    mobileTarget: '[data-onboarding="settings-notifications"]',
    title: 'Notifications',
    description:
      'Tune reminders for tasks, habits, projects, focus sessions, and calendar sync. Every toggle is saved immediately.',
    position: 'right',
    route: '/settings?tab=notifications',
  },
  {
    id: 'settings-integrations',
    target: '[data-onboarding="settings-integrations"]',
    mobileTarget: '[data-onboarding="settings-integrations"]',
    title: 'Integrations',
    description:
      'Connect Google Calendar here. This is the dedicated sync layer, separate from Google sign-in, so the account and calendar stay cleanly decoupled.',
    position: 'left',
    route: '/settings?tab=integrations',
  },
  {
    id: 'settings-security',
    target: '[data-onboarding="settings-security"]',
    mobileTarget: '[data-onboarding="settings-security"]',
    title: 'Security',
    description:
      'Manage password access and recovery email from one secure place. This keeps account recovery available even if your sign-in method changes.',
    position: 'left',
    route: '/settings?tab=security',
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export const WELCOME_MESSAGE = {
  title: 'Welcome to your Productivity Workspace',
  subtitle:
    'We will show you around in less than 60 seconds. You will discover how to manage tasks, track habits, plan your calendar, and fine-tune your workspace settings.',
  startButton: 'Start Tour',
  skipButton: 'Skip',
};

export const FINISH_MESSAGE = {
  title: "You're ready!",
  subtitle: 'Enjoy building your most productive life.',
  button: 'Go to Dashboard',
};
