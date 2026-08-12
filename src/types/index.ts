/**
 * frontend/src/types/index.ts
 * TypeScript DTOs used by frontend.
 */

// ─── User ───────────────────────────────────────────────────────────────────

/** Public user shape returned by the API (no passwordHash, no tokens). */
export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  recoveryEmail: string | null;
  timezone: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: string; // ISO 8601
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDTO;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface SetPasswordRequest {
  newPassword: string;
}

export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export type LayoutPreference = 'COMFORTABLE' | 'COMPACT' | 'EXPANDED';
export type TaskViewPreference = 'list' | 'board';

export interface NotificationPreferenceDTO {
  taskDue: boolean;
  habitReminder: boolean;
  projectDeadline: boolean;
  focusSessionComplete: boolean;
  calendarSync: boolean;
}

export interface AppearanceSettingsDTO {
  themePreference: ThemePreference;
  layoutPreference: LayoutPreference;
  calendarView: 'day' | 'week' | 'month' | 'agenda';
  taskView: TaskViewPreference;
}

export interface GoogleCalendarIntegrationDTO {
  connected: boolean;
  googleEmail: string | null;
  calendarId: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  isActive: boolean;
  syncTasks: boolean;
}

export interface SecuritySettingsDTO {
  hasPassword: boolean;
  hasGoogle: boolean;
  recoveryEmail: string | null;
}

export interface AIPreferenceDTO {
  dailyBriefEnabled: boolean;
  journalWeeklyEnabled: boolean;
  insightsEnabled: boolean;
  coachEnabled: boolean;
  journalAnalysisEnabled: boolean;
  goalSummaryEnabled: boolean;
  taskParserEnabled: boolean;
  goalPlannerEnabled: boolean;
  summaryRefreshMinutes: number;

  // ─── Token consumption counters (read-only, set server-side) ──────────
  tokensToday: number;
  tokensThisWeek: number;
  tokensThisMonth: number;
  tokensTotal: number;
  aiCallsTotal: number;
  tokenUsageUpdatedAt: string | null;
}

export interface SettingsDTO {
  appearance: AppearanceSettingsDTO;
  notifications: NotificationPreferenceDTO;
  ai: AIPreferenceDTO;
  integrations: {
    googleCalendar: GoogleCalendarIntegrationDTO;
  };
  security: SecuritySettingsDTO;
}

export interface UpdateAppearanceRequest {
  themePreference?: ThemePreference;
  layoutPreference?: LayoutPreference;
  calendarView?: 'day' | 'week' | 'month' | 'agenda';
  taskView?: TaskViewPreference;
}

export interface UpdateNotificationPreferencesRequest extends NotificationPreferenceDTO {}

export interface UpdateAIPreferencesRequest extends AIPreferenceDTO {}

export interface UpdateRecoveryEmailRequest {
  recoveryEmail: string | null;
}

export interface GoogleAuthStartResponse {
  url: string;
}

export type GoogleAuthPurpose = 'signin' | 'calendar-connect';

export interface GoogleCalendarSyncResponse {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GoalDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  color: string;
  targetDate: string | null;
  status: GoalStatus;
  priority: GoalPriority;
  progress: number;
  aiSummary: string | null;
  linkedHabitIds: string[];
  linkedTaskIds: string[];
  linkedProjectIds: string[];
  milestones: GoalMilestoneDTO[];
  habitCount: number;
  taskCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export type GoalMilestoneStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';

export interface GoalMilestoneDTO {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: GoalMilestoneStatus;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalMilestoneRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status?: GoalMilestoneStatus;
  sortOrder?: number;
}

export interface UpdateGoalMilestoneRequest {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: GoalMilestoneStatus;
  sortOrder?: number;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  targetDate?: string | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  aiSummary?: string | null;
  linkedHabitIds?: string[];
  linkedTaskIds?: string[];
  linkedProjectIds?: string[];
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string | null;
  category?: string | null;
  icon?: string | null;
  color?: string;
  targetDate?: string | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  aiSummary?: string | null;
  linkedHabitIds?: string[];
  linkedTaskIds?: string[];
  linkedProjectIds?: string[];
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SubTaskDTO {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubTaskRequest {
  title: string;
  order?: number;
}

export interface TaskSubTaskInput {
  id?: string;
  title: string;
  order?: number;
  completed?: boolean;
}

export interface UpdateSubTaskRequest {
  title?: string;
  completed?: boolean;
  order?: number;
}

export interface TaskDTO {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  dueTime: string | null;
  reminderTime: string | null;
  reminderMessage: string | null;
  recurrenceRule: string | null;
  recurrenceConfig: TaskRecurrenceConfig | null;
  recurrenceEndDate: string | null;
  skipDates: string[];
  parentTaskId: string | null;
  attachmentUrl: string | null;
  voiceNoteUrl: string | null;
  inProgressAt: string | null;
  completedAt: string | null;
  estimatedDuration: number | null;
  project?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  subTasks?: SubTaskDTO[];
  createdAt: string;
  updatedAt: string;
}

/** Per-tab task counts returned by GET /tasks/counts. */
export interface TaskCountsDTO {
  pending: number;
  today: number;
  upcoming: number;
  completed: number;
  overdue: number;
  all: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
  dueTime?: string | null;
  reminderTime?: string | null;
  reminderMessage?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  skipDates?: string[];
  parentTaskId?: string;
  estimatedDuration?: number | null;
  attachmentUrl?: string | null;
  voiceNoteUrl?: string | null;
  subTasks?: CreateSubTaskRequest[];
  recurrenceConfig?: TaskRecurrenceConfig;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  dueTime?: string | null;
  reminderTime?: string | null;
  reminderMessage?: string | null;
  recurrenceRule?: string | null;
  recurrenceEndDate?: string | null;
  skipDates?: string[];
  attachmentUrl?: string | null;
  voiceNoteUrl?: string | null;
  estimatedDuration?: number | null;
  goalId?: string | null;
  subTasks?: TaskSubTaskInput[];
  recurrenceConfig?: TaskRecurrenceConfig | null;
}

export type TaskRecurrenceFrequency = 'day' | 'week' | 'month' | 'year';
export type TaskRecurrenceEndsType = 'never' | 'date' | 'occurrences';
export type TaskRecurrenceRepeatBasedOn = 'dueDate' | 'completionDate';
export type TaskRecurrenceMissedBehavior = 'skip' | 'overdue' | 'createNext';
export type TaskRecurrenceGenerateNext = 'onCompletion' | 'onDueDate';
export type TaskRecurrenceMonthlyMode = 'dayOfMonth' | 'weekdayPattern';

export interface TaskRecurrenceConfig {
  enabled: boolean;
  frequency: TaskRecurrenceFrequency;
  interval: number;
  weekdays?: string[];
  monthlyMode?: TaskRecurrenceMonthlyMode;
  dayOfMonth?: number | null;
  weekOfMonth?: number | null;
  weekday?: string | null;
  startsAt?: string | null;
  endsType?: TaskRecurrenceEndsType;
  endsAt?: string | null;
  occurrenceCount?: number | null;
  repeatBasedOn?: TaskRecurrenceRepeatBasedOn;
  missedBehavior?: TaskRecurrenceMissedBehavior;
  generateNext?: TaskRecurrenceGenerateNext;
}

export interface TaskActivityDTO {
  id: string;
  taskId: string;
  userId: string;
  type: string;
  content: string;
  createdAt: string;
}

export interface CreateTaskTimeEntryRequest {
  minutes: number;
  note?: string;
  startedAt?: string;
}

export interface TaskTimeEntryDTO {
  id: string;
  taskId: string;
  userId: string;
  minutes: number;
  note: string | null;
  startedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetailDTO extends TaskDTO {
  activity: TaskActivityDTO[];
  timeEntries: TaskTimeEntryDTO[];
  linkedNotes: NoteDTO[];
  attachments: MediaItemDTO[];
  voiceNotes: MediaItemDTO[];
}

// ─── Habits ──────────────────────────────────────────────────────────────────

export interface HabitDTO {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  targetPerWeek: number;
  reminderTime: string | null;
  reminderMessage: string | null;
  durationDays: number | null;
  skipDays: number[];
  streakBrokenAt: string | null;
  isActive: boolean;
  createdAt: string;
  currentStreak: number;
  completedToday: boolean;
  completionsThisWeek: number;
  completionsLastWeek: number;
  bestStreak: number;
  weekPattern: boolean[];
  completionDates: string[];
  streakSafeDays: string[];
  totalXp: number;
}

export interface CreateHabitRequest {
  title: string;
  reminderTime?: string;
  reminderMessage?: string;
  durationDays?: number | null;
  skipDays?: number[];
  goalId?: string | null;
}

export interface UpdateHabitRequest {
  title?: string;
  reminderTime?: string | null;
  reminderMessage?: string | null;
  durationDays?: number | null;
  skipDays?: number[];
  goalId?: string | null;
}

export interface HabitCompletionDTO {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export type NoteMood = 'great' | 'good' | 'neutral' | 'bad' | 'awful' | null;

export type NoteSortField = 'updatedAt' | 'createdAt' | 'title';
export type NoteSortOrder = 'asc' | 'desc';

export interface NoteDTO {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  isJournal: boolean;
  taskId: string | null;
  projectId: string | null;
  attachmentUrl: string | null;
  voiceNoteUrl: string | null;
  isPinned: boolean;
  mood: NoteMood;
  tags: string[];
  archived: boolean;
  bookmarkPage?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  title?: string;
  content: string;
  isJournal?: boolean;
  taskId?: string | null;
  projectId?: string | null;
  attachmentUrl?: string | null;
  voiceNoteUrl?: string | null;
  mood?: NoteMood;
  tags?: string[];
  bookmarkPage?: number | null;
}

export interface UpdateNoteRequest {
  title?: string | null;
  content?: string;
  isJournal?: boolean;
  taskId?: string | null;
  projectId?: string | null;
  attachmentUrl?: string | null;
  voiceNoteUrl?: string | null;
  isPinned?: boolean;
  mood?: NoteMood;
  tags?: string[];
  archived?: boolean;
  bookmarkPage?: number | null;
}

// ─── Focus Sessions ──────────────────────────────────────────────────────────

export type FocusSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface FocusSessionDTO {
  id: string;
  userId: string;
  durationMin: number;
  elapsedMin: number;
  startedAt: string;
  status: FocusSessionStatus;
  completedAt: string | null;
  taskId: string | null;
  projectId: string | null;
  isBreak: boolean;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface MediaItemDTO {
  id: string;
  url: string;
  type: 'attachment' | 'voice_note';
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
}

export interface ProjectDTO {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  userId: string;
  goalId: string | null;
  startDate: string | null;
  dueDate: string | null;
  attachmentUrl: string | null;
  voiceNoteUrl: string | null;
  attachments: MediaItemDTO[];
  voiceNotes: MediaItemDTO[];
  progress: number;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  startDate?: string;
  dueDate?: string;
  attachmentUrl?: string | null;
  voiceNoteUrl?: string | null;
  goalId?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string;
  startDate?: string | null;
  dueDate?: string | null;
  attachmentUrl?: string | null;
  voiceNoteUrl?: string | null;
  progress?: number;
  goalId?: string | null;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsSummaryDTO {
  tasksCompleted: number;
  tasksTotal: number;
  taskCompletionRate: number;
  habitsCompletedToday: number;
  habitsTotal: number;
  focusMinutesTotal: number;
  focusSessionsTotal: number;
  overdueTasks: number;
  cancelledFocusSessions: number;
  missedHabitsToday: number;
  longestHabitStreak: number;
  currentHabitStreak: number;
  productivityScore: number;
}

export interface InsightDTO {
  id: string;
  type: 'positive' | 'neutral' | 'warning';
  icon: 'trend' | 'clock' | 'calendar' | 'alert';
  text: string;
}

// ─── Gamification ─────────────────────────────────────────────────────────

export interface PointLedgerDTO {
  id: string;
  points: number;
  reason: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
}

export interface AchievementDTO {
  id: string;
  key: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  pointsAwarded: number;
  unlockedAt: string;
}

export interface AchievementWithStatusDTO {
  key: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  pointsAwarded: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  progressCurrent: number;
  progressTarget: number;
}

export interface GamificationProfileDTO {
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progressPercent: number;
  achievements: AchievementDTO[];
  recentAchievements: AchievementDTO[];
  recentPoints: PointLedgerDTO[];
}

export interface EnhancedDashboardDTO extends AnalyticsSummaryDTO {
  gamification: GamificationProfileDTO;
  activeProjects: ProjectDTO[];
  projectStats: {
    totalProjects: number;
    activeProjectsCount: number;
    completedProjectsCount: number;
  };
  weeklyProgress: {
    week: string;
    tasksCompleted: number;
    focusMinutes: number;
    habitsCompleted: number;
    projectsCompleted: number;
  }[];
  upcomingDeadlines: Array<{
    type: 'task' | 'project';
    id: string;
    title: string;
    dueDate: string;
    daysUntilDue: number;
  }>;
  insights: InsightDTO[];
}

// ─── Misc ────────────────────────────────────────────────────────────────────

/** Standard list response envelope — supports both cursor and offset pagination. */
export interface ListResponse<T> {
  data: T[];
  meta: {
    total: number;
    // Cursor pagination
    nextCursor?: string | null;
    // Offset pagination (present when ?page= was used)
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

export interface GoogleCalendarSyncResponse {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
}

// ─── Notifications & Activity Feed ───────────────────────────────────────────

export type InAppNotificationType =
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_STATUS_CHANGED'
  | 'HABIT_COMPLETED'
  | 'HABIT_STREAK'
  | 'FOCUS_SESSION_COMPLETED'
  | 'PROJECT_CREATED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_STATUS_CHANGED'
  | 'TASK_OVERDUE'
  | 'TASK_DUE_SOON'
  | 'HABIT_PENDING';

export interface InAppNotificationDTO {
  id: string;
  type: InAppNotificationType;
  title: string;
  description: string | null;
  entityType: string;
  entityId: string;
  isActionable: boolean;
  timestamp: string; // ISO 8601
  metadata?: Record<string, any>;
}

export interface ActivityFeedMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  totalActionable: number;
  totalActivity: number;
}

export interface ActivityFeedResponse {
  data: InAppNotificationDTO[];
  meta: ActivityFeedMeta;
}

export type NotificationChannel = 'BROWSER_PUSH' | 'EMAIL' | 'NATIVE_LOCAL';

export interface NotificationLogDTO {
  id: string;
  userId: string;
  type: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  sentAt: string;
  isRead: boolean;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

// ─── Habits (extended) ───────────────────────────────────────────────────────

/** Shape returned by GET /habits */
export interface HabitsListResponse {
  data: HabitDTO[];
  meta: { total: number };
}

/** A single day entry returned by GET /habits/week-overview */
export interface WeekDayDTO {
  date: string;
  score: number;
  completed: number;
  total: number;
  isFuture: boolean;
  isToday: boolean;
}

/** Shape returned by GET /habits/week-overview */
export interface WeekOverviewDTO {
  days: WeekDayDTO[];
  weekScore: number;
}

/** A habit whose streak was broken, returned by GET /habits/streak-status */
export interface HabitStreakBreakDTO {
  habitId: string;
  title: string;
  previousStreak: number;
  brokenAt: string;
  xpLost: number;
}

// ─── Notes (extended) ────────────────────────────────────────────────────────

export interface NoteListParams {
  search?: string;
  isJournal?: boolean;
  taskId?: string;
  projectId?: string;
  isPinned?: boolean;
  archived?: boolean;
  hasAttachment?: boolean;
  mood?: NoteMood;
  tags?: string[];
  sortBy?: NoteSortField;
  sortOrder?: NoteSortOrder;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export type CalendarEventType = 'TASK_DUE' | 'FOCUS_SESSION';

export interface CalendarEventDTO {
  id: string;
  type: CalendarEventType;
  title: string;
  startAt: string; // ISO 8601
  endAt: string | null;
  allDay: boolean;
  entityId: string;
  color: string | null;
  metadata?: {
    durationMin?: number;
    description?: string | null;
  };
}

export interface CalendarOverviewDTO {
  events: CalendarEventDTO[];
}

// ─── Goals (AI Planner) ──────────────────────────────────────────────────────

export interface GoalPlannerMilestoneItem {
  title: string;
  description?: string;
  dueDate?: string | null;
}

export interface GoalPlannerTaskItem {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
}

export interface GoalPlannerHabitItem {
  title: string;
  reminderTime?: string;
  durationDays?: number | null;
}

export interface GoalPlannerProjectItem {
  name: string;
  description?: string;
  color?: string;
}

export interface GoalPlannerPlanDTO {
  goal: {
    title: string;
    description?: string;
    category?: string;
    icon?: string;
    color?: string;
    targetDate?: string | null;
    priority?: GoalPriority;
  };
  summary: string;
  milestones: GoalPlannerMilestoneItem[];
  tasks: GoalPlannerTaskItem[];
  habits: GoalPlannerHabitItem[];
  projects: GoalPlannerProjectItem[];
  source: 'ai' | 'fallback';
}

export interface GoalWorkspaceCreateResponse {
  goal: GoalDTO;
  milestonesCreated: number;
  tasksCreated: number;
  habitsCreated: number;
  projectsCreated: number;
}

// ─── Notion ──────────────────────────────────────────────────────────────────

export interface NotionIntegrationDTO {
  connected: boolean;
  workspaceName: string | null;
  workspaceIcon: string | null;
  connectedAt: string | null;
  botId: string | null;
  lastSyncedAt: string | null;
}

export interface NotionDatabaseDTO {
  id: string;
  title: string;
  object: 'database' | 'data_source';
  icon: string | null;
  url: string | null;
}

export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'status'
  | string;

export interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: NotionPropertyType;
  options?: Array<{ id: string; name: string; color?: string }>;
}

export interface NotionImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  items?: Array<{ id: string; title: string }>;
}

export interface NotionPagePreview {
  id: string;
  title: string;
  properties: Record<string, unknown>;
  url: string | null;
  lastEdited: string | null;
  alreadyImported: boolean;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export type SearchResultType = 'task' | 'habit' | 'note' | 'project';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string | null;
  description?: string | null;
  metadata?: {
    taskId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    [key: string]: unknown;
  };
}

// ─── Analytics (extended) ────────────────────────────────────────────────────

export interface DailyAnalyticsDTO {
  date: string; // YYYY-MM-DD
  tasksCreated: number;
  tasksCompleted: number;
  tasksOverdue: number;
  focusMinutes: number;
  habitsCompleted: number;
  productivityScore: number;
}

export type ProjectHealth = 'AHEAD' | 'ON_TRACK' | 'BEHIND';

export interface ProjectAnalyticsDTO {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  progress: number;
  expectedProgress: number;
  progressDelta: number;
  health: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  focusMinutes: number;
  daysRemaining: number | null;
  expectedFinish: string | null;
  actualFinish: string | null;
  weeklyProgress: Array<{
    week: string;
    tasksCompleted: number;
  }>;
}
