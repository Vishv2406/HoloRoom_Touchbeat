// aiInsights.ts — AI-powered energy insights and anomaly detection
import { getAIProvider } from './aiProvider';
import { buildHomeContext, contextToString } from './aiContextBuilder';
import { SYSTEM_ENERGY, SYSTEM_ANOMALY } from './aiPrompts';
import { useHomeStore } from '../../store/useHomeStore';

export interface AnomalyAlert {
  deviceId: number;
  deviceName: string;
  roomName: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface EnergyInsight {
  summary: string;
  topConsumer: string;
  savings: string;
  forecast: string;
}

// Detect anomalies without AI (rule-based fallback)
export function detectAnomaliesLocal(): AnomalyAlert[] {
  const home = useHomeStore.getState();
  const alerts: AnomalyAlert[] = [];
  const now = Date.now();

  for (const room of home.rooms) {
    for (const d of room.devices) {
      if (!d.isOn || !d.lastToggled) continue;
      const onMinutes = (now - d.lastToggled) / 60000;

      if (d.type === 'geyser' && onMinutes > 60) {
        alerts.push({ deviceId: d.id, deviceName: d.name, roomName: room.name, issue: `Geyser active for ${Math.round(onMinutes)} minutes`, severity: 'high', suggestion: 'Turn off geyser to save energy' });
      }
      if (d.type === 'light' && onMinutes > 480) {
        alerts.push({ deviceId: d.id, deviceName: d.name, roomName: room.name, issue: `Light on for ${Math.round(onMinutes / 60)} hours`, severity: 'low', suggestion: 'Check if room is occupied' });
      }
      if (d.type === 'tv' && onMinutes > 360) {
        alerts.push({ deviceId: d.id, deviceName: d.name, roomName: room.name, issue: `TV on for ${Math.round(onMinutes / 60)} hours`, severity: 'medium', suggestion: 'Enable sleep timer' });
      }
      if (d.type === 'ac' && onMinutes > 720) {
        alerts.push({ deviceId: d.id, deviceName: d.name, roomName: room.name, issue: `AC running for ${Math.round(onMinutes / 60)} hours`, severity: 'medium', suggestion: 'Consider setting a timer' });
      }
    }
  }
  return alerts;
}

// Generate local energy insight without AI
export function generateLocalInsight(): EnergyInsight {
  const ctx = buildHomeContext();
  const top = ctx.energySummary.topConsumers[0];
  const rate = useHomeStore.getState().electricityRate;

  const acRooms = ctx.rooms.filter(r => r.devices.some(d => d.type === 'ac' && d.isOn));
  const highBrightness = ctx.rooms.flatMap(r => r.devices).filter(d => d.type === 'light' && d.isOn && (d as any).brightness > 80);

  const savings: string[] = [];
  if (acRooms.length) savings.push(`Set AC to 26°C to save ≈₹${Math.round(acRooms.length * 240)}/month`);
  if (highBrightness.length) savings.push(`Dim ${highBrightness.length} light(s) to 70% to save ≈₹${highBrightness.length * 30}/month`);

  return {
    summary: `${ctx.activeDevices} devices active consuming ${Math.round(ctx.totalPower)}W`,
    topConsumer: top ? `${top.name} (${Math.round(top.watts)}W, ${top.room})` : 'No active devices',
    savings: savings.length ? savings.join(' · ') : 'Usage looks efficient',
    forecast: `Monthly forecast: ₹${Math.round(ctx.energySummary.monthlyRs)}`,
  };
}

// AI-powered energy analysis
export async function analyzeEnergyWithAI(): Promise<string> {
  const provider = getAIProvider();
  if (!provider?.isAvailable()) return generateLocalInsightText();

  const ctx = buildHomeContext();
  const contextStr = contextToString(ctx);

  try {
    return await provider.chat([
      { role: 'system', content: SYSTEM_ENERGY },
      { role: 'user', content: `Analyze this smart home energy data and give 3-4 specific recommendations:\n\n${contextStr}` },
    ]);
  } catch {
    return generateLocalInsightText();
  }
}

function generateLocalInsightText(): string {
  const insight = generateLocalInsight();
  return `**Energy Summary**\n${insight.summary}\n\n**Top Consumer:** ${insight.topConsumer}\n\n**Savings:** ${insight.savings}\n\n**Forecast:** ${insight.forecast}`;
}
