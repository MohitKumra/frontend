// frontend/src/features/notifications/utils/navigation.ts
// Utility functions for navigating to entities from notifications

/**
 * Get the route for a given entity type and ID
 * Used by NotificationCenter to navigate when clicking notifications
 */
export function getEntityRoute(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'task':
      return `/tasks?taskId=${entityId}`;
    case 'project':
      return `/projects?projectId=${entityId}`;
    case 'habit':
      return `/habits`;
    case 'focus':
      return `/focus`;
    default:
      return '/';
  }
}
