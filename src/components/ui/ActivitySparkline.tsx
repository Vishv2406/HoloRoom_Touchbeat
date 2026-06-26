// ActivitySparkline.tsx — Pure SVG 24-hour activity bar chart
import { useActivityStore } from '../../store/useActivityStore';

interface ActivitySparklineProps {
  deviceId: number;
  width?: number;
  height?: number;
  color?: string;
}

export default function ActivitySparkline({ deviceId, width = 240, height = 36, color = '#00D4FF' }: ActivitySparklineProps) {
  const getHourlyBuckets = useActivityStore(s => s.getHourlyBuckets);
  const buckets = getHourlyBuckets(deviceId);

  const barW = (width - 2) / 24;
  const gap = 1;
  const barInner = Math.max(1, barW - gap);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {buckets.map((active, i) => (
        <rect
          key={i}
          x={1 + i * barW}
          y={active ? 4 : height - 6}
          width={barInner}
          height={active ? height - 8 : 3}
          rx={1}
          fill={active ? color : 'rgba(255,255,255,0.08)'}
          opacity={active ? 0.85 : 1}
        />
      ))}
      {/* Hour markers at 0, 6, 12, 18 */}
      {[0, 6, 12, 18].map(h => (
        <text
          key={h}
          x={1 + h * barW + barW / 2}
          y={height}
          fontSize={7}
          fill="rgba(255,255,255,0.3)"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          {h === 0 ? '00' : h === 6 ? '06' : h === 12 ? '12' : '18'}
        </text>
      ))}
    </svg>
  );
}
