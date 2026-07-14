/**
 * frontend/src/types/taskPhase1.ts
 *
 * TEMPORARY scaffolding for Phase 1 (frontend-first sequencing).
 *
 * None of `project`, `labels`, `estimatedDurationMin`, `isBlocked`, or
 * `blockedReason` exist on the real TaskDTO yet — they land with the
 * backend pass (migration + task.service.ts + tasks.routes.ts changes
 * agreed separately). Until then:
 *
 *   - `TaskDTOPhase1` is what TaskDTO will look like once that ships.
 *   - `MOCK_PROJECTS` / `MOCK_LABELS` stand in for `useProjects()` and the
 *     not-yet-built `useLabels()` so the picker UI can be built and
 *     reviewed now.
 *
 * DELETE THIS FILE once the backend fields exist — fold `TaskDTOPhase1`
 * into `TaskDTO` in `types/index.ts` and swap the mock lists/hooks below
 * for the real `useProjects`/`useLabels` queries.
 */

import type { TaskDTO, CreateTaskRequest, UpdateTaskRequest, ProjectDTO } from './index';

export interface LabelDTO {
  id: string;
  name: string;
  color: string;
}

export interface TaskDTOPhase1 extends TaskDTO {
  project: Pick<ProjectDTO, 'id' | 'name' | 'color'> | null;
  labels: LabelDTO[];
  estimatedDurationMin: number | null;
}

export interface CreateTaskRequestPhase1 extends CreateTaskRequest {
  projectId?: string | null;
  labelIds?: string[];
  estimatedDurationMin?: number | null;
}

export interface UpdateTaskRequestPhase1 extends UpdateTaskRequest {
  projectId?: string | null;
  labelIds?: string[];
  estimatedDurationMin?: number | null;
}

// ─── Mock data (delete alongside this file once real endpoints exist) ──────

export const MOCK_PROJECTS: Pick<ProjectDTO, 'id' | 'name' | 'color'>[] = [
  { id: 'proj_1', name: 'Website Redesign', color: '#4F46E5' },
  { id: 'proj_2', name: 'Q3 Marketing', color: '#10B981' },
  { id: 'proj_3', name: 'Mobile App', color: '#F59E0B' },
];

export const MOCK_LABELS: LabelDTO[] = [
  { id: 'lbl_1', name: 'Bug', color: '#EF4444' },
  { id: 'lbl_2', name: 'Feature', color: '#3B82F6' },
  { id: 'lbl_3', name: 'Urgent', color: '#F59E0B' },
  { id: 'lbl_4', name: 'Client', color: '#8B5CF6' },
];

/** Stand-in for a future `useLabels()` query hook. */
export function useMockLabels(): { data: LabelDTO[] } {
  return { data: MOCK_LABELS };
}

/** Adds mock estimatedDuration/blocked/project/labels onto a real TaskDTO for preview purposes. */
export function withMockPhase1Fields(task: TaskDTO): TaskDTOPhase1 {
  // Deterministic-ish mock assignment from the id so the same task always
  // renders the same mock state during a session (avoids UI flicker/flakiness).
  const seed = task.id.charCodeAt(task.id.length - 1) || 0;
  return {
    ...task,
    project: seed % 3 === 0 ? null : MOCK_PROJECTS[seed % MOCK_PROJECTS.length],
    labels: seed % 4 === 0 ? [] : [MOCK_LABELS[seed % MOCK_LABELS.length]],
  estimatedDurationMin: seed % 5 === 0 ? null : (seed % 6) * 30 + 30,
  };
}