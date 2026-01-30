'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface UsageChartProps {
  data: ChartDataPoint[];
  type?: 'area' | 'bar' | 'line';
  color?: string;
  title?: string;
  height?: number;
  showGrid?: boolean;
  dataKey?: string;
  secondaryDataKey?: string;
  secondaryColor?: string;
}

export default function UsageChart({
  data,
  type = 'area',
  color = '#667eea',
  title,
  height = 200,
  showGrid = true,
  dataKey = 'value',
  secondaryDataKey,
  secondaryColor = '#22c55e',
}: UsageChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 15, 26, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: 0 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, fontSize: '0.9rem', fontWeight: 600, margin: '4px 0 0' }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />}
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey={dataKey} 
              fill={color} 
              radius={[4, 4, 0, 0]}
              name={title || dataKey}
            />
            {secondaryDataKey && (
              <Bar 
                dataKey={secondaryDataKey} 
                fill={secondaryColor} 
                radius={[4, 4, 0, 0]}
                name={secondaryDataKey}
              />
            )}
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />}
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: color }}
              name={title || dataKey}
            />
            {secondaryDataKey && (
              <Line 
                type="monotone" 
                dataKey={secondaryDataKey} 
                stroke={secondaryColor} 
                strokeWidth={2}
                dot={{ fill: secondaryColor, strokeWidth: 2 }}
                name={secondaryDataKey}
              />
            )}
          </LineChart>
        );
      
      case 'area':
      default:
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
              {secondaryDataKey && (
                <linearGradient id={`gradient-${secondaryColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={secondaryColor} stopOpacity={0}/>
                </linearGradient>
              )}
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />}
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fill={`url(#gradient-${color.replace('#', '')})`}
              strokeWidth={2}
              name={title || dataKey}
            />
            {secondaryDataKey && (
              <Area 
                type="monotone" 
                dataKey={secondaryDataKey} 
                stroke={secondaryColor} 
                fill={`url(#gradient-${secondaryColor.replace('#', '')})`}
                strokeWidth={2}
                name={secondaryDataKey}
              />
            )}
          </AreaChart>
        );
    }
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
