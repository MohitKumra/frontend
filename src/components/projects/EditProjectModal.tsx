import React, { useState } from 'react';
import { Folder } from 'lucide-react';
import { useUpdateProject } from '../../features/projects/hooks/useProjects';
import { DraggableModal } from '../ui/DraggableModal';
import type { ProjectDTO, UpdateProjectRequest, ProjectStatus } from '../../types';

interface EditProjectModalProps {
  isOpen: boolean;
  project: ProjectDTO;
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

export function EditProjectModal({ isOpen, project, onClose }: EditProjectModalProps) {
  const updateProject = useUpdateProject(project.id);
  const [formData, setFormData] = useState<UpdateProjectRequest>({
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    color: project.color,
    startDate: project.startDate?.split('T')[0] ?? '',
    dueDate: project.dueDate?.split('T')[0] ?? '',
    progress: project.progress,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProject.mutateAsync(formData);
      onClose();
    } catch (error) {
      console.error('Failed to update project:', error);
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
    <DraggableModal isOpen={isOpen} onClose={onClose} title="Edit Project">
      {/* Icon banner */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: project.color }}
        >
          <Folder size={20} className="text-white" />
        </div>
        <p className="text-xs text-text-muted font-medium truncate">{project.name}</p>
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
            value={formData.description ?? ''}
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
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as ProjectStatus })
            }
            className={inputCls}
            style={inputStyle}
          >
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Progress */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">
            Progress: {formData.progress ?? 0}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.progress ?? 0}
            onChange={(e) =>
              setFormData({ ...formData, progress: parseInt(e.target.value) })
            }
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${formData.progress}%, var(--color-border) ${formData.progress}%, var(--color-border) 100%)`,
            }}
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-bold text-text-primary mb-2">
            Project Color
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-10 h-10 rounded-lg transition-all ${
                  formData.color === color
                    ? 'ring-2 ring-offset-2 ring-accent scale-110'
                    : 'hover:scale-105'
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
              value={formData.startDate ?? ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-primary mb-2">Due Date</label>
            <input
              type="date"
              value={formData.dueDate ?? ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>

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
            disabled={!formData.name || updateProject.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--gradient-accent)' }}
          >
            {updateProject.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
}
