// frontend/src/features/tasks/api.ts
import apiClient from '../../lib/apiClient';
import type {
  TaskDTO,
  TaskDetailDTO,
  CreateTaskRequest,
  UpdateTaskRequest,
  ListResponse,
  SubTaskDTO,
  CreateSubTaskRequest,
  UpdateSubTaskRequest,
  TaskDependencyDTO,
  CreateTaskDependencyRequest,
  TaskCommentDTO,
  CreateTaskCommentRequest,
  TaskTimeEntryDTO,
  CreateTaskTimeEntryRequest,
} from '../../types';

export const tasksApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<ListResponse<TaskDTO>>('/tasks', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<TaskDetailDTO>(`/tasks/${id}`).then((r) => r.data),

  create: (data: CreateTaskRequest) =>
    apiClient.post<TaskDTO>('/tasks', data).then((r) => r.data),

  update: (id: string, data: UpdateTaskRequest) =>
    apiClient.patch<TaskDTO>(`/tasks/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/tasks/${id}`),

  // Subtask endpoints
  listSubTasks: (taskId: string) =>
    apiClient.get<SubTaskDTO[]>(`/tasks/${taskId}/subtasks`).then((r) => r.data),

  createSubTask: (taskId: string, data: CreateSubTaskRequest) =>
    apiClient.post<SubTaskDTO>(`/tasks/${taskId}/subtasks`, data).then((r) => r.data),

  updateSubTask: (taskId: string, subTaskId: string, data: UpdateSubTaskRequest) =>
    apiClient.patch<SubTaskDTO>(`/tasks/${taskId}/subtasks/${subTaskId}`, data).then((r) => r.data),

  deleteSubTask: (taskId: string, subTaskId: string) =>
    apiClient.delete(`/tasks/${taskId}/subtasks/${subTaskId}`),

  createDependency: (taskId: string, data: CreateTaskDependencyRequest) =>
    apiClient.post<TaskDependencyDTO>(`/tasks/${taskId}/dependencies`, data).then((r) => r.data),

  deleteDependency: (taskId: string, dependencyId: string) =>
    apiClient.delete(`/tasks/${taskId}/dependencies/${dependencyId}`),

  createComment: (taskId: string, data: CreateTaskCommentRequest) =>
    apiClient.post<TaskCommentDTO>(`/tasks/${taskId}/comments`, data).then((r) => r.data),

  createTimeEntry: (taskId: string, data: CreateTaskTimeEntryRequest) =>
    apiClient.post<TaskTimeEntryDTO>(`/tasks/${taskId}/time-entries`, data).then((r) => r.data),
};
