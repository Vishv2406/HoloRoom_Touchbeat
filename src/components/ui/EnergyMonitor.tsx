// EnergyMonitor.tsx — Full energy monitoring modal with charts — mobile responsive
import { useState, useMemo } from 'react';
import { X, Zap, TrendingUp, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { useHomeStore, computeDeviceWatts } from '../../store/useHomeStore';
import { useUIStore } from '../../store/useUIStore';
import { getEnergyHistory } from '../../data/energyHistory';
import { calcMonthlyCost, calcCarbon } from '../../utils/formatters';

const ROOM_COLORS = ['#00D4FF', '#9D6FFF', '#00F5A0', '#FFB800', '#FF6B6B'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function EnergyMonitor() {
  const [tab, setTab] = useState<'live' | '24h' | '30d'>('live');
  const isOpen = useUIStore(s => s.isEnergyOpen);
  const toggleEnergy = useUIStore(s => s.toggleEnergy);
  const rooms = useHomeStore(s => s.rooms);
  const toggleDevice = useHomeStore(s => s.toggleDevice);
  const totalPower = useHomeStore(s => s.getTotalPower());
  const rate = useHomeStore(s => s.electricityRate);
  const energyHistory = useMemo(() => getEnergyHistory(), []);

  const allDevices = useMemo(() => {
    const list: any[] = [];
    for (const room of rooms) {
      for (const d of room.devices) {
        list.push({ ...d, roomName: room.name, watts: computeDeviceWatts(d) });
      }
    }
    return list.sort((a, b) => b.watts - a.watts);
  }, [rooms]);

  const dailyKwh = (totalPower / 1000) * 24;
  const monthlyKwh = dailyKwh * 30;
  const monthlyRs = monthlyKwh * rate;
  const indianAvg = 1200;
  const vsAvg = Math.round(((monthlyRs - indianAvg) / indianAvg) * 100);
  const co2Monthly = calcCarbon(totalPower);

  const powerColor = totalPower < 500 ? 'var(--green)' : totalPower < 2000 ? 'var(--amber)' : 'var(--red)';
  const powerLabel = totalPower < 500 ? 'Normal load' : totalPower < 2000 ? 'Moderate load' : 'High load';

  const hourlyData = useMemo(() => energyHistory.hourly.map(p => ({
    time: format(new Date(p.timestamp), 'ha'),
    watts: p.totalWatts,
    'Master Bed': p.byRoom[1] ?? 0,
    'Bed 2': p.byRoom[2] ?? 0,
    'Living': p.byRoom[3] ?? 0,
    'Kitchen': p.byRoom[4] ?? 0,
    'Bath': p.byRoom[5] ?? 0,
  })), [energyHistory]);

  const dailyData = useMemo(() => energyHistory.daily.map(p => ({
    date: format(new Date(p.timestamp), 'MMM d'),
    kwh: +((p.totalWatts / 1000) * 24).toFixed(1),
    cost: Math.round((p.totalWatts / 1000) * 24 * rate),
  })), [energyHistory, rate]);

  const roomMonthly = useMemo(() => rooms.map((room, i) => {
    const rPower = room.devices.reduce((s, d) => s + computeDeviceWatts(d), 0);
    return { name: room.name, kwh: +((rPower / 1000) * 24 * 30).toFixed(1), color: ROOM_COLORS[i] };
  }), [rooms]);

  const recommendations = useMemo(() => {
    const tips: { icon: string; title: string; desc: string; saving: string }[] = [];
    const ac = allDevices.find(d => d.type === 'ac' && d.isOn);
    if (ac && ac.temperature < 26) tips.push({ icon: '💰', title: 'AC Temp Optimization', desc: `Set AC to 26°C instead of ${ac.temperature}°C`, saving: '≈₹240/month saved' });
    if (totalPower > 2000) tips.push({ icon: '⚡', title: 'Peak Load Alert', desc: 'Multiple high-draw devices running simultaneously', saving: 'Stagger usage to save ≈₹180/month' });
    const geyser = allDevices.find(d => d.type === 'geyser' && d.isOn);
    if (geyser) tips.push({ icon: '🚿', title: 'Geyser Running', desc: 'Turn off after use — typically left on by mistake', saving: '≈₹120/month if managed' });
    if (tips.length < 3) tips.push({ icon: '🌿', title: 'Green Energy Tips', desc: 'Use natural light during daytime hours', saving: 'Reduces carbon footprint' });
    if (tips.length < 3) tips.push({ icon: '📅', title: 'Schedule Automations', desc: 'Set timers for lights and fans', saving: '≈₹80/month saved' });
    return tips.slice(0, 3);
  }, [allDevices, totalPower]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) toggleEnergy(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 320, damping: 38 }}
          className="w-full flex flex-col overflow-hidden"
          style={{
            maxWidth: 900,
            height: 'min(90vh, 90dvh)',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-bright)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="min-w-0">
              <div className="font-display font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Zap style={{ color: 'var(--amber)', flexShrink: 0 }} size={18} />Energy Intelligence
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Real-time power analytics for your home</div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="flex gap-0.5 p-1 rounded-lg" style={{ background: 'var(--bg-2)' }}>
                {(['live', '24h', '30d'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                    style={{ background: tab === t ? 'var(--bg-3)' : 'transparent', color: tab === t ? 'var(--cyan)' : 'var(--text-secondary)' }}
                  >{t === 'live' ? 'Live' : t === '24h' ? '24H' : '30D'}</button>
                ))}
              </div>
              <button onClick={toggleEnergy} className="p-1.5 rounded-lg hover:opacity-60 transition-all">
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* LIVE TAB */}
            {tab === 'live' && (
              <div className="flex flex-col gap-4">
                {/* KPI Row — 2 cols on mobile, 4 on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Current Load', value: `${Math.round(totalPower).toLocaleString()} W`, sub: powerLabel, color: powerColor, icon: <Zap size={14} /> },
                    { label: 'Daily Estimate', value: `${dailyKwh.toFixed(2)} kWh`, sub: `≈₹${Math.round(dailyKwh * rate)} today`, color: 'var(--cyan)', icon: <TrendingUp size={14} /> },
                    { label: 'Monthly Forecast', value: `₹${Math.round(monthlyRs).toLocaleString()}`, sub: vsAvg > 0 ? `↑${vsAvg}% vs avg` : `↓${Math.abs(vsAvg)}% vs avg`, color: vsAvg > 10 ? 'var(--red)' : 'var(--green)', icon: <TrendingUp size={14} /> },
                    { label: 'Carbon', value: `${co2Monthly.toFixed(1)} kg CO₂`, sub: `≈${Math.round(co2Monthly * 4)} car km`, color: 'var(--green)', icon: <Leaf size={14} /> },
                  ].map((kpi, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1 mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {kpi.icon}<span className="text-[11px]">{kpi.label}</span>
                      </div>
                      <div className="font-display font-bold text-lg leading-tight" style={{ color: kpi.color }}>{kpi.value}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Device list — card layout on mobile, table on desktop */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {/* Desktop table header — hidden on mobile */}
                  <div className="hidden sm:grid text-xs px-4 py-2 font-medium"
                    style={{ gridTemplateColumns: '2fr 1fr 70px 60px 70px 80px 60px 44px', background: 'var(--bg-2)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    <span>Device</span><span>Room</span><span>Status</span><span>Power</span><span>Daily</span><span>Monthly</span><span>Share</span><span>Ctrl</span>
                  </div>
                  {/* Mobile header */}
                  <div className="sm:hidden text-xs px-3 py-2 font-medium flex justify-between"
                    style={{ background: 'var(--bg-2)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    <span>Device / Room</span><span>Power</span><span>Ctrl</span>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {allDevices.map(d => (
                      <div key={d.id}>
                        {/* Desktop row */}
                        <div className="hidden sm:grid items-center px-4 py-2.5 text-xs"
                          style={{ gridTemplateColumns: '2fr 1fr 70px 60px 70px 80px 60px 44px' }}>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.name}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{d.roomName}</div>
                          <div>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: d.isOn ? 'var(--green-dim)' : 'var(--bg-3)', color: d.isOn ? 'var(--green)' : 'var(--text-muted)' }}>
                              {d.isOn ? '● ON' : 'OFF'}
                            </span>
                          </div>
                          <div style={{ color: d.watts > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>{Math.round(d.watts)}W</div>
                          <div style={{ color: 'var(--text-secondary)' }}>₹{Math.round((d.watts / 1000) * 24 * rate)}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>₹{Math.round(calcMonthlyCost(d.watts, rate))}</div>
                          <div className="flex items-center">
                            <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--bg-3)' }}>
                              <div className="h-full rounded-full" style={{ width: `${totalPower > 0 ? Math.round((d.watts / totalPower) * 100) : 0}%`, background: 'var(--cyan)' }} />
                            </div>
                          </div>
                          <button onClick={() => toggleDevice(d.id)} className="relative rounded-full transition-all" style={{ background: d.isOn ? 'var(--cyan)' : 'var(--bg-3)', width: 36, height: 18, flexShrink: 0 }}>
                            <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all" style={{ background: 'white', left: d.isOn ? '18px' : '2px' }} />
                          </button>
                        </div>

                        {/* Mobile row */}
                        <div className="sm:hidden flex items-center px-3 py-2.5 gap-3 text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{d.name}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{d.roomName}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div style={{ color: d.watts > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>{Math.round(d.watts)}W</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>₹{Math.round(calcMonthlyCost(d.watts, rate))}/mo</div>
                          </div>
                          <button onClick={() => toggleDevice(d.id)} className="relative rounded-full transition-all shrink-0" style={{ background: d.isOn ? 'var(--cyan)' : 'var(--bg-3)', width: 36, height: 20 }}>
                            <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ background: 'white', left: d.isOn ? '16px' : '2px' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations — 1 col mobile, 3 desktop */}
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>💡 Smart Recommendations</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {recommendations.map((tip, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                        <div className="text-lg mb-1.5">{tip.icon}</div>
                        <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{tip.title}</div>
                        <div className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>{tip.desc}</div>
                        <div className="text-[11px] font-medium" style={{ color: 'var(--green)' }}>{tip.saving}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 24H TAB */}
            {tab === '24h' && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Power Usage — Last 24 Hours</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={hourlyData}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="watts" stroke="#00D4FF" fill="url(#areaGrad)" strokeWidth={2} name="Watts" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Consumption by Room</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={hourlyData}>
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 9, color: 'var(--text-muted)' }} />
                      {['Master Bed', 'Bed 2', 'Living', 'Kitchen', 'Bath'].map((r, i) => (
                        <Bar key={r} dataKey={r} stackId="a" fill={ROOM_COLORS[i]} name={r} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Peak', value: `${Math.max(...hourlyData.map(h => h.watts)).toLocaleString()}W`, sub: 'highest hour' },
                    { label: 'Lowest', value: `${Math.min(...hourlyData.map(h => h.watts)).toLocaleString()}W`, sub: 'lowest hour' },
                    { label: 'Average', value: `${Math.round(hourlyData.reduce((s, h) => s + h.watts, 0) / hourlyData.length).toLocaleString()}W`, sub: '24h average' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                      <div className="font-display font-bold text-base mb-0.5" style={{ color: 'var(--cyan)' }}>{s.value}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 30D TAB */}
            {tab === '30d' && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Daily kWh — Last 30 Days</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyData}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="kwh" stroke="#00D4FF" strokeWidth={2} dot={false} name="kWh" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>This Month</div>
                    <div className="font-display font-bold text-xl" style={{ color: 'var(--cyan)' }}>
                      ₹{Math.round(monthlyRs).toLocaleString()}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{monthlyKwh.toFixed(1)} kWh</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Room Usage</div>
                    <div className="flex flex-col gap-1 mt-1">
                      {roomMonthly.slice(0, 4).map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="truncate mr-2" style={{ color: r.color }}>{r.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{r.kwh} kWh</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
