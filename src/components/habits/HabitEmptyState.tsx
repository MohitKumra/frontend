import { Card } from '../ui/Card';
import { FloatingHabitsEmpty } from '../ui/FloatingHabitsEmpty';

interface HabitEmptyStateProps {
  onCreateHabit: () => void;
}

export function HabitEmptyState({ onCreateHabit }: HabitEmptyStateProps) {
  return (
    <Card
      variant="default"
      className="relative overflow-hidden p-6 sm:p-10 text-center"
      style={{ borderRadius: '32px' }}
    >
      <FloatingHabitsEmpty onCreateHabit={onCreateHabit} />
    </Card>
  );
}
