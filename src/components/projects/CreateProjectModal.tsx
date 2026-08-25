import React, { useState } from 'react';
import { Folder } from 'lucide-react';
import { useCreateProject } from '../../features/projects/hooks/useProjects';
import { useGoals } from '../../features/goals/hooks/useGoals';
import { DraggableModal } from '../ui/DraggableModal';
import type { CreateProjectRequest, ProjectStatus } from '../../types';
import { MediaAttachmentsField } from '../media/MediaAttachmentsField';
import { UpgradeModal } from '../billing/UpgradeModal';
import { CheckoutModal } from '../billing/CheckoutModal';
import type { PlanDTO } from '../../features/billing/useUserPlan';
import toast from 'react-hot-toast';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const createProject = useCreateProject();
  const goalsQuery = useGoals();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanDTO | null>(null);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    status: 'PLANNING',
    color: PROJECT_COLORS[0],
    startDate: '',
    dueDate: '',
    attachmentUrl: '',
    voiceNoteUrl: '',
    goalId: null,
  });

  const goals = goalsQuery.data?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createProject.mutateAsync(formData);
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        status: 'PLANNING',
        color: PROJECT_COLORS[0],
        startDate: '',
        dueDate: '',
        attachmentUrl: '',
        voiceNoteUrl: '',
        goalId: null,
      });
    } catch (error: any) {
      const code = error?.response?.data?.error?.code;
      if (code === 'PLAN_LIMIT_REACHED') {
        onClose();
        setUpgradeModalOpen(true);
      } else {
        toast.error(error?.response?.data?.error?.message || 'Failed to create project');
        console.error('Failed to create project:', error);
      }
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all';
  const inputStyle = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <>
    <DraggableModal isOpen={isOpen} onClose={onClose} title="Create New Project">
      {/* Icon banner — visible in both desktop header and mobile sheet */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--gradient-accent)' }}
        >
          <Folder size={20} className="text-white" />
        </div>
        <p className="text-xs text-text-muted font-medium">Fill in the details below to create a new project.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project Name */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">
            Project Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name"
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter project description"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-accent transition-all resize-none"
            style={inputStyle}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
            className={inputCls}
            style={inputStyle}
          >
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">Goal</label>
          <select
            value={formData.goalId ?? ''}
            onChange={(e) => setFormData({ ...formData, goalId: e.target.value || null })}
            className={inputCls}
            style={inputStyle}
          >
            <option value="">No goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">Project Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-10 h-10 rounded-lg transition-all ${
                  formData.color === color ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-105'
                }`}
                style={{ background: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-2">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-2">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>

        <MediaAttachmentsField
          attachmentUrl={formData.attachmentUrl ?? ''}
          onAttachmentUrlChange={(value) => setFormData({ ...formData, attachmentUrl: value })}
          voiceNoteUrl={formData.voiceNoteUrl ?? ''}
          onVoiceNoteUrlChange={(value) => setFormData({ ...formData, voiceNoteUrl: value })}
        />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.name || createProject.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--gradient-accent)' }}
          >
            {createProject.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </DraggableModal>
    <UpgradeModal
      isOpen={upgradeModalOpen}
      onClose={() => setUpgradeModalOpen(false)}
      highlightFeature="Project Creation"
      onSelectPlan={(plan) => {
        setUpgradeModalOpen(false);
        setCheckoutPlan(plan);
      }}
    />
    <CheckoutModal
      isOpen={!!checkoutPlan}
      onClose={() => setCheckoutPlan(null)}
      plan={checkoutPlan}
      onBack={() => {
        setCheckoutPlan(null);
        setUpgradeModalOpen(true);
      }}
      highlightFeature="Project Creation"
    />
  </>
  );
}
