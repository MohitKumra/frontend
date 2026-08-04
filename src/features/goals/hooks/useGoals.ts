import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../api';
import type { CreateGoalRequest, UpdateGoalRequest, CreateGoalMilestoneRequest, UpdateGoalMilestoneRequest } from '../../../types';

const GOALS_KEY = ['goals'] as const;

export function useGoals() {
  return useQuery({
    queryKey: GOALS_KEY,
    queryFn: goalsApi.list,
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: [...GOALS_KEY, id],
    queryFn: () => goalsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalRequest) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateGoal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateGoalRequest) => goalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
      queryClient.invalidateQueries({ queryKey: [...GOALS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: import('../api').DeleteGoalOptions }) =>
      goalsApi.delete(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useGoalMilestones(goalId: string) {
  return useQuery({
    queryKey: [...GOALS_KEY, goalId, 'milestones'],
    queryFn: () => goalsApi.listMilestones(goalId),
    enabled: !!goalId,
  });
}

export function useCreateGoalMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalMilestoneRequest) => goalsApi.createMilestone(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...GOALS_KEY, goalId] });
      queryClient.invalidateQueries({ queryKey: [...GOALS_KEY, goalId, 'milestones'] });
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useUpdateGoalMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: UpdateGoalMilestoneRequest }) =>
      goalsApi.updateMilestone(goalId, milestoneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...GOALS_KEY, goalId] });
      queryClient.invalidateQueries({ queryKey: [...GOALS_KEY, goalId, 'milestones'] });
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useDeleteGoalMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => goalsApi.deleteMilestone(goalId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...GOALS_KEY, goalId] });
      queryClient.invalidateQueries({ queryKey: [...GOALS_KEY, goalId, 'milestones'] });
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}
