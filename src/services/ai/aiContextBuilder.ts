// aiContextBuilder.ts — Builds structured home context for AI prompts
import { useHomeStore } from '../../store/useHomeStore';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useSceneStore } from '../../store/useSceneStore';
import { useConnectionStore } from '../../store/useConnectionStore';
import { calcMonthlyCost } from '../../utils/formatters';

export interface HomeContext {
  homeName: string;
  totalPower: number;
  activeDevices: number;
  mqttStatus: string;
  rooms: RoomContext[];
  scenes: SceneContext[];
  automations: AutomationContext[];
  energySummary: EnergySummary;
}

export interface RoomContext {
  id: number;
  name: string;
  temperature: number;
  humidity: number;
  activeDevices: number;
  totalWatts: number;
  devices: DeviceContext[];
}

export interface DeviceContext {
  id: number;
  name: string;
  type: string;
  isOn: boolean;
  watts: number;
  settings: string;
}

export interface SceneContext {
  id: number;
  name: string;
  emoji: string;
  stepCount: number;
}

export interface AutomationContext {
  id: number;
  name: string;
  isEnabled: boolean;
  triggerType: string;
  runCount: number;
}

export interface EnergySummary {
  totalWatts: number;
  dailyKwh: number;
  monthlyRs: number;
  topConsumers: { name: string; watts: number; room: string }[];
}

function computeDeviceWatts(d: any): number {
  if (!d.isOn) return 0;
  const FAN_MAP: Record<number, number> = { 1: 25, 2: 40, 3: 55, 4: 70, 5: 85 };
  switch (d.type) {
    case 'light': return d.energyWatts * ((d.brightness ?? 100) / 100);
    case 'fan': return FAN_MAP[d.speed ?? 3] ?? 55;
    default: return d.energyWatts;
  }
}

export function buildHomeContext(): HomeContext {
  const home = useHomeStore.getState();
  const automation = useAutomationStore.getState();
  const scenes = useSceneStore.getState();
  const conn = useConnectionStore.getState();
  const rate = home.electricityRate;

  const allDevices: { name: string; watts: number; room: string }[] = [];

  const rooms: RoomContext[] = home.rooms.map(room => {
    const devices: DeviceContext[] = room.devices.map(d => {
      const watts = computeDeviceWatts(d);
      allDevices.push({ name: d.name, watts, room: room.name });
      const settings: string[] = [];
      if (d.brightness != null && d.isOn) settings.push(`brightness ${d.brightness}%`);
      if (d.temperature != null && d.isOn) settings.push(`${d.temperature}°C`);
      if (d.speed != null && d.isOn) settings.push(`speed ${d.speed}`);
      if (d.volume != null && d.isOn) settings.push(`vol ${d.volume}%`);
      return { id: d.id, name: d.name, type: d.type, isOn: d.isOn, watts, settings: settings.join(', ') };
    });
    const totalWatts = devices.reduce((s, d) => s + d.watts, 0);
    const activeDevices = devices.filter(d => d.isOn).length;
    return { id: room.id, name: room.name, temperature: room.temperature, humidity: room.humidity, activeDevices, totalWatts, devices };
  });

  const totalWatts = home.getTotalPower();
  const dailyKwh = (totalWatts / 1000) * 24;
  const monthlyRs = dailyKwh * 30 * rate;
  const topConsumers = allDevices.filter(d => d.watts > 0).sort((a, b) => b.watts - a.watts).slice(0, 5);

  return {
    homeName: home.homeName,
    totalPower: totalWatts,
    activeDevices: home.getActiveDeviceCount(),
    mqttStatus: conn.status,
    rooms,
    scenes: scenes.scenes.map(s => ({ id: s.id, name: s.name, emoji: s.emoji, stepCount: s.steps.length })),
    automations: automation.rules.map(r => ({ id: r.id, name: r.name, isEnabled: r.isEnabled, triggerType: r.trigger.type, runCount: r.runCount })),
    energySummary: { totalWatts, dailyKwh, monthlyRs, topConsumers },
  };
}

export function contextToString(ctx: HomeContext): string {
  const lines: string[] = [
    `HOME: ${ctx.homeName} | Power: ${Math.round(ctx.totalPower)}W | Active: ${ctx.activeDevices} devices | MQTT: ${ctx.mqttStatus}`,
    `ENERGY: Daily ~${ctx.energySummary.dailyKwh.toFixed(1)} kWh | Monthly ~₹${Math.round(ctx.energySummary.monthlyRs)}`,
    '',
    'ROOMS:',
  ];
  for (const room of ctx.rooms) {
    lines.push(`  ${room.name} | ${room.temperature}°C ${room.humidity}% | ${room.activeDevices} active | ${Math.round(room.totalWatts)}W`);
    for (const d of room.devices) {
      const status = d.isOn ? `ON ${Math.round(d.watts)}W${d.settings ? ' (' + d.settings + ')' : ''}` : 'OFF';
      lines.push(`    [${d.id}] ${d.name} (${d.type}): ${status}`);
    }
  }
  lines.push('', 'SCENES: ' + ctx.scenes.map(s => `${s.emoji}${s.name}[id:${s.id}]`).join(', '));
  lines.push('AUTOMATIONS: ' + (ctx.automations.length
    ? ctx.automations.map(a => `${a.name}[id:${a.id}] ${a.isEnabled ? '✓' : '✗'}`).join(', ')
    : 'none'));
  lines.push('TOP CONSUMERS: ' + ctx.energySummary.topConsumers.map(c => `${c.name}(${Math.round(c.watts)}W)`).join(', '));
  return lines.join('\n');
}
