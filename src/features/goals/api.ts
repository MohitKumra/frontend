import apiClient from '../../lib/apiClient';
import type {
  CreateGoalRequest,
  GoalDTO,
  GoalMilestoneDTO,
  GoalPlannerPlanDTO,
  GoalWorkspaceCreateResponse,
  ListResponse,
  UpdateGoalRequest,
  CreateGoalMilestoneRequest,
  UpdateGoalMilestoneRequest,
} from '../../types';

export interface DeleteGoalOptions {
  deleteLinkedHabits?: boolean;
  deleteLinkedTasks?: boolean;
  deleteLinkedProjects?: boolean;
}

export const goalsApi = {
  list: () => apiClient.get<ListResponse<GoalDTO>>('/goals').then((r) => r.data),
  getOne: (id: string) => apiClient.get<GoalDTO>(`/goals/${id}`).then((r) => r.data),
  create: (data: CreateGoalRequest) => apiClient.post<GoalDTO>('/goals', data).then((r) => r.data),
  update: (id: string, data: UpdateGoalRequest) => apiClient.patch<GoalDTO>(`/goals/${id}`, data).then((r) => r.data),
  // Axios requires `data` config key to send a body on DELETE
  delete: (id: string, options: DeleteGoalOptions = {}) =>
    apiClient.delete(`/goals/${id}`, { data: options }),
  listMilestones: (goalId: string) => apiClient.get<GoalMilestoneDTO[]>(`/goals/${goalId}/milestones`).then((r) => r.data),
  createMilestone: (goalId: string, data: CreateGoalMilestoneRequest) =>
    apiClient.post<GoalMilestoneDTO>(`/goals/${goalId}/milestones`, data).then((r) => r.data),
  updateMilestone: (goalId: string, milestoneId: string, data: UpdateGoalMilestoneRequest) =>
    apiClient.patch<GoalMilestoneDTO>(`/goals/${goalId}/milestones/${milestoneId}`, data).then((r) => r.data),
  deleteMilestone: (goalId: string, milestoneId: string) => apiClient.delete(`/goals/${goalId}/milestones/${milestoneId}`),
};

export const goalPlannerApi = {
  generatePlan: (prompt: string) => apiClient.post<GoalPlannerPlanDTO>('/ai/goal-plan', { prompt }).then((r) => r.data),
  createWorkspace: (plan: GoalPlannerPlanDTO) =>
    apiClient.post<GoalWorkspaceCreateResponse>('/ai/goal-workspace', { plan }).then((r) => r.data),
};
