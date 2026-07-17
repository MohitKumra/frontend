import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, MapPin, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { useWeather } from '../../features/habits/hooks/useWeather';

interface WeatherWidgetProps {
  location?: string;
}

export function WeatherWidget({}: WeatherWidgetProps) {
  const { weather, loading, error } = useWeather();
  if (!weather && loading) {
    return (
      <Card variant="default" className="p-5 relative overflow-hidden" style={{ borderRadius: '20px' }}>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-text-muted animate-spin" />
        </div>
      </Card>
    );
  }
  if (!weather) return null;

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun size={40} className="text-warning" />;
      case 'cloudy': return <Cloud size={40} className="text-text-muted" />;
      case 'rainy': return <CloudRain size={40} className="text-info" />;
      case 'snowy': return <CloudSnow size={40} className="text-info" />;
      case 'windy': return <Wind size={40} className="text-text-muted" />;
      default: return <Sun size={40} className="text-warning" />;
    }
  };

  const getGradientForCondition = (condition: string) => {
    switch (condition) {
      case 'sunny': return 'linear-gradient(135deg, #FFB80020, transparent)';
      case 'cloudy': return 'linear-gradient(135deg, #64748B20, transparent)';
      case 'rainy': return 'linear-gradient(135deg, #3B82F620, transparent)';
      default: return 'linear-gradient(135deg, #FFB80020, transparent)';
    }
  };

  return (
    <Card
      variant="default"
      className="p-5 relative overflow-hidden"
      style={{ borderRadius: '20px' }}
    >
      {/* Weather gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: getGradientForCondition(weather.condition),
        }}
      />

      <div className="relative">
        {/* Location */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={14} className="text-text-muted" />
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate">
            {weather.location}
          </p>
        </div>
        
        {/* Temp + Icon */}
        <div className="flex items-center justify-between mb-5">
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[48px] font-black text-text-primary leading-none mb-2">
              {weather.temp}°
            </p>
            <p className="text-xs font-bold text-text-secondary capitalize">
              {weather.condition}
            </p>
          </motion.div>
          
          <motion.div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: weather.condition === 'sunny'
                ? '#FFB80015'
                : 'var(--color-surface-raised)',
            }}
            animate={{
              rotate: weather.condition === 'sunny' ? [0, 10, 0] : 0,
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {getWeatherIcon(weather.condition)}
          </motion.div>
        </div>

        {/* High/Low */}
        <div
          className="pt-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              H:
            </span>
            <span className="text-sm font-black text-text-primary">{weather.high}°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              L:
            </span>
            <span className="text-sm font-black text-text-primary">{weather.low}°</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
