import React from 'react';
import { BarChart2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WeeklyProgressChartProps {
  data: Array<{
    week: string;
    tasksCompleted: number;
    focusMinutes: number;
    habitsCompleted: number;
    projectsCompleted: number;
  }>;
}

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  // Format week labels (e.g., "2024-W01" -> "W01")
  const chartData = data.map((item) => ({
    ...item,
    weekLabel: item.week.split('-W')[1] ? `W${item.week.split('-W')[1]}` : item.week,
  }));

  return (
    <Card variant="default" className="pinterest-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div 
        className="px-5 py-4 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'var(--icon-bg-accent)',
              color: 'var(--icon-text-accent)',
            }}
          >
            <BarChart2 size={16} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Weekly Progress</h3>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Last 8 Weeks
        </span>
      </div>

      {/* Chart */}
      <div className="p-5 flex-1 flex flex-col min-h-0">
        <div className="h-full w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorHabits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--color-border-subtle)" 
                vertical={false} 
              />
              <XAxis 
                dataKey="weekLabel" 
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false} 
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--color-surface-raised)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 12, 
                  boxShadow: 'var(--shadow-md)',
                  padding: '8px 12px',
                }} 
                labelStyle={{ 
                  color: 'var(--color-text-primary)', 
                  fontWeight: 'bold',
                  fontSize: 11,
                  marginBottom: 4,
                }} 
                itemStyle={{
                  fontSize: 11,
                  fontWeight: 'bold',
                  padding: '2px 0',
                }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: 11, 
                  fontWeight: 'bold',
                  paddingTop: 10,
                }}
                iconType="circle"
              />
              <Line 
                type="monotone" 
                dataKey="tasksCompleted" 
                name="Tasks"
                stroke="var(--color-accent)" 
                fill="url(#colorTasks)" 
                strokeWidth={2.5} 
                dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="habitsCompleted" 
                name="Habits"
                stroke="var(--color-success)" 
                fill="url(#colorHabits)" 
                strokeWidth={2.5} 
                dot={{ r: 3, fill: 'var(--color-success)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="focusMinutes" 
                name="Focus"
                stroke="var(--color-info)" 
                fill="url(#colorFocus)" 
                strokeWidth={2.5} 
                dot={{ r: 3, fill: 'var(--color-info)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
