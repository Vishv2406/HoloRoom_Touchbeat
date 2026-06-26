// AutomationEngine.tsx — Full automation rule builder modal
import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useHomeStore } from '../../store/useHomeStore';
import { useUIStore } from '../../store/useUIStore';
import { AUTOMATION_TEMPLATES } from '../../data/automationTemplates';
import { relativeTime } from '../../utils/formatters';
import type { AutomationRule, AutomationTrigger, AutomationAction } from '../../types';

type Category = 'all' | 'comfort' | 'security' | 'energy' | 'custom';
const CAT_COLORS: Record<string, string> = { comfort: '#00D4FF', security: '#FF4D6D', energy: '#FFB800', custom: '#9D6FFF' };
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function newTrigger(): AutomationTrigger { return { type: 'time', time: '08:00', days: [1,2,3,4,5] }; }
function newAction(): AutomationAction { return { type: 'device_control', deviceAction: 'turn_on' }; }

interface BuilderState {
  name: string;
  description: string;
  category: AutomationRule['category'];
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  isEnabled: boolean;
}

export default function AutomationEngine() {
  const isOpen = useUIStore(s => s.isAutomationOpen);
  const toggleAutomation = useUIStore(s => s.toggleAutomation);
  const { rules, addRule, updateRule, deleteRule, toggleRule, addFromTemplate } = useAutomationStore();
  const rooms = useHomeStore(s => s.rooms);
  const allDevices = useMemo(() => rooms.flatMap(r => r.devices.map(d => ({ ...d, roomName: r.name }))), [rooms]);

  const [cat, setCat] = useState<Category>('all');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [builder, setBuilder] = useState<BuilderState>({
    name: '', description: '', category: 'custom',
    trigger: newTrigger(), actions: [newAction()], isEnabled: true,
  });

  const filtered = cat === 'all' ? rules : rules.filter(r => r.category === cat);

  const openNew = () => {
    setBuilder({ name: '', description: '', category: 'custom', trigger: newTrigger(), actions: [newAction()], isEnabled: true });
    setEditId(null);
    setBuilderOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setBuilder({ name: rule.name, description: rule.description ?? '', category: rule.category, trigger: rule.trigger, actions: rule.actions, isEnabled: rule.isEnabled });
    setEditId(rule.id);
    setBuilderOpen(true);
  };

  const saveRule = () => {
    const ruleData = { name: builder.name || 'New Rule', description: builder.description, category: builder.category, trigger: builder.trigger, actions: builder.actions, isEnabled: builder.isEnabled };
    if (editId) updateRule(editId, ruleData);
    else addRule(ruleData);
    setBuilderOpen(false);
  };

  const updateTrigger = (t: Partial<AutomationTrigger>) => setBuilder(b => ({ ...b, trigger: { ...b.trigger, ...t } }));
  const updateAction = (i: number, a: Partial<AutomationAction>) => setBuilder(b => {
    const actions = [...b.actions]; actions[i] = { ...actions[i], ...a }; return { ...b, actions };
  });
  const addAction = () => setBuilder(b => ({ ...b, actions: [...b.actions, newAction()] }));
  const removeAction = (i: number) => setBuilder(b => ({ ...b, actions: b.actions.filter((_, j) => j !== i) }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) toggleAutomation(); }}
    >
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full flex rounded-2xl overflow-hidden"
        style={{ maxWidth: 960, height: '85vh', background: 'var(--bg-1)', border: '1px solid var(--border-bright)' }}
      >
        {/* Left: Rule list */}
        <div className="flex flex-col" style={{ width: 360, borderRight: '1px solid var(--border)', flexShrink: 0 }}>
          <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Automation Engine</div>
              <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--cyan)', color: '#000' }}>
                <Plus size={12} />New Rule
              </button>
            </div>
            {/* Category filter */}
            <div className="flex gap-1 flex-wrap">
              {(['all','comfort','security','energy','custom'] as Category[]).map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className="px-2.5 py-1 rounded-full text-xs capitalize transition-all"
                  style={{ background: cat === c ? (c === 'all' ? 'var(--bg-3)' : `${CAT_COLORS[c]}22`) : 'var(--bg-2)', color: cat === c ? (c === 'all' ? 'var(--text-primary)' : CAT_COLORS[c]) : 'var(--text-muted)', border: `1px solid ${cat === c ? (c === 'all' ? 'var(--border-bright)' : CAT_COLORS[c]) : 'transparent'}` }}
                >{c}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {filtered.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No rules. Create one!</div>
            )}
            {filtered.map(rule => (
              <div key={rule.id} className="rounded-xl p-3 transition-all" style={{ background: 'var(--bg-2)', border: `1px solid ${rule.isEnabled ? 'var(--border-bright)' : 'var(--border)'}` }}>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: rule.isEnabled ? 'var(--green)' : 'var(--text-muted)' }} />
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{rule.name}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(rule)} className="p-1 rounded hover:opacity-60"><Edit2 size={11} style={{ color: 'var(--text-muted)' }} /></button>
                    <button onClick={() => deleteRule(rule.id)} className="p-1 rounded hover:opacity-60"><Trash2 size={11} style={{ color: 'var(--red)' }} /></button>
                  </div>
                </div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{rule.description}</div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] capitalize" style={{ background: `${CAT_COLORS[rule.category]}22`, color: CAT_COLORS[rule.category] }}>{rule.category}</span>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {rule.runCount > 0 && <span>▶ {rule.runCount}×</span>}
                    {rule.lastTriggered && <span>{relativeTime(rule.lastTriggered)}</span>}
                    <button onClick={() => toggleRule(rule.id)} className="relative w-8 h-4 rounded-full transition-all" style={{ background: rule.isEnabled ? 'var(--cyan)' : 'var(--bg-3)' }}>
                      <span className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ background: 'white', left: rule.isEnabled ? '17px' : '2px' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Templates */}
            {rules.length < 5 && (
              <div className="mt-2">
                <div className="text-xs font-medium mb-2 px-1" style={{ color: 'var(--text-muted)' }}>⚡ Quick Templates</div>
                {AUTOMATION_TEMPLATES.map((tpl, i) => (
                  <div key={i} className="rounded-xl p-3 mb-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                    <div className="font-medium text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{tpl.name}</div>
                    <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{tpl.description}</div>
                    <button onClick={() => addFromTemplate(i)} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'var(--cyan-glow)', color: 'var(--cyan)', border: '1px solid var(--cyan-border)' }}>Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Builder or empty state */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {builderOpen ? (editId ? 'Edit Rule' : 'New Rule') : 'Rule Builder'}
            </div>
            <button onClick={toggleAutomation} className="p-2 rounded-lg hover:opacity-60"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
          </div>

          {!builderOpen ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3">
              <div className="text-4xl">⚡</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a rule to edit or create a new one</div>
              <button onClick={openNew} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--cyan)', color: '#000' }}>
                <Plus size={14} className="inline mr-1.5" />Create New Rule
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* TRIGGER */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div className="font-medium text-sm mb-3" style={{ color: 'var(--cyan)' }}>A — TRIGGER: What starts this rule?</div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {[{v:'device_state',l:'📱 Device State'},{v:'time',l:'⏰ Time'},{v:'sun',l:'🌅 Sun Event'},{v:'energy',l:'⚡ Energy'}].map(t => (
                    <button key={t.v} onClick={() => updateTrigger({ type: t.v as AutomationTrigger['type'] })}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: builder.trigger.type === t.v ? 'var(--cyan)' : 'var(--bg-3)', color: builder.trigger.type === t.v ? '#000' : 'var(--text-secondary)' }}
                    >{t.l}</button>
                  ))}
                </div>

                {builder.trigger.type === 'device_state' && (
                  <div className="flex flex-col gap-3">
                    <select value={builder.trigger.deviceId ?? ''} onChange={e => updateTrigger({ deviceId: +e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      <option value="">Select device...</option>
                      {allDevices.map(d => <option key={d.id} value={d.id}>{d.roomName} — {d.name}</option>)}
                    </select>
                    <div className="flex gap-2 flex-wrap">
                      {['turns_on','turns_off','brightness_above','brightness_below'].map(c => (
                        <button key={c} onClick={() => updateTrigger({ condition: c as any })}
                          className="px-2.5 py-1 rounded-lg text-xs transition-all"
                          style={{ background: builder.trigger.condition === c ? 'var(--cyan-glow)' : 'var(--bg-3)', color: builder.trigger.condition === c ? 'var(--cyan)' : 'var(--text-muted)', border: builder.trigger.condition === c ? '1px solid var(--cyan)' : '1px solid transparent' }}
                        >{c.replace(/_/g, ' ')}</button>
                      ))}
                    </div>
                  </div>
                )}

                {builder.trigger.type === 'time' && (
                  <div className="flex flex-col gap-3">
                    <input type="time" value={builder.trigger.time ?? '08:00'} onChange={e => updateTrigger({ time: e.target.value })}
                      className="px-3 py-2 rounded-lg text-sm w-36" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    <div className="flex gap-1.5">
                      {DAY_LABELS.map((d, i) => (
                        <button key={i} onClick={() => { const days = builder.trigger.days ?? []; const nd = days.includes(i) ? days.filter(x => x !== i) : [...days, i]; updateTrigger({ days: nd }); }}
                          className="w-8 h-8 rounded-full text-xs font-bold transition-all"
                          style={{ background: (builder.trigger.days ?? []).includes(i) ? 'var(--cyan)' : 'var(--bg-3)', color: (builder.trigger.days ?? []).includes(i) ? '#000' : 'var(--text-muted)' }}
                        >{d}</button>
                      ))}
                    </div>
                  </div>
                )}

                {builder.trigger.type === 'sun' && (
                  <div className="flex gap-2">
                    {['sunrise','sunset'].map(s => (
                      <button key={s} onClick={() => updateTrigger({ sunEvent: s as any })}
                        className="px-3 py-2 rounded-lg text-sm capitalize transition-all"
                        style={{ background: builder.trigger.sunEvent === s ? 'var(--amber-dim)' : 'var(--bg-3)', color: builder.trigger.sunEvent === s ? 'var(--amber)' : 'var(--text-muted)', border: builder.trigger.sunEvent === s ? '1px solid var(--amber)' : '1px solid transparent' }}
                      >{s === 'sunrise' ? '🌅' : '🌇'} {s}</button>
                    ))}
                  </div>
                )}

                {builder.trigger.type === 'energy' && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>When home power exceeds</span>
                    <input type="number" min={100} max={10000} step={100} value={builder.trigger.energyThreshold ?? 2000}
                      onChange={e => updateTrigger({ energyThreshold: +e.target.value })}
                      className="w-24 px-2 py-1 rounded-lg text-sm text-center" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>W</span>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div className="font-medium text-sm mb-3" style={{ color: 'var(--cyan)' }}>B — THEN: What happens?</div>
                {builder.actions.map((action, i) => (
                  <div key={i} className="rounded-lg p-3 mb-2" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Action {i + 1}</span>
                      {builder.actions.length > 1 && (
                        <button onClick={() => removeAction(i)}><X size={12} style={{ color: 'var(--red)' }} /></button>
                      )}
                    </div>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {[{v:'device_control',l:'🔌 Device'},{v:'scene',l:'🎬 Scene'},{v:'notification',l:'🔔 Notify'}].map(t => (
                        <button key={t.v} onClick={() => updateAction(i, { type: t.v as AutomationAction['type'] })}
                          className="px-2.5 py-1 rounded-lg text-xs transition-all"
                          style={{ background: action.type === t.v ? 'var(--cyan)' : 'var(--bg-2)', color: action.type === t.v ? '#000' : 'var(--text-muted)' }}
                        >{t.l}</button>
                      ))}
                    </div>
                    {action.type === 'device_control' && (
                      <div className="flex flex-col gap-2">
                        <select value={action.deviceId ?? ''} onChange={e => updateAction(i, { deviceId: +e.target.value })}
                          className="w-full px-2 py-1.5 rounded text-xs" style={{ background: 'var(--bg-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                          <option value="">Select device...</option>
                          {allDevices.map(d => <option key={d.id} value={d.id}>{d.roomName} — {d.name}</option>)}
                        </select>
                        <div className="flex gap-1 flex-wrap">
                          {['turn_on','turn_off','toggle','set_brightness','set_speed'].map(a => (
                            <button key={a} onClick={() => updateAction(i, { deviceAction: a as any })}
                              className="px-2 py-1 rounded text-[10px] transition-all"
                              style={{ background: action.deviceAction === a ? 'var(--cyan-glow)' : 'transparent', color: action.deviceAction === a ? 'var(--cyan)' : 'var(--text-muted)', border: action.deviceAction === a ? '1px solid var(--cyan)' : '1px solid transparent' }}
                            >{a.replace(/_/g, ' ')}</button>
                          ))}
                        </div>
                        {(action.deviceAction === 'set_brightness' || action.deviceAction === 'set_speed') && (
                          <input type="number" min={1} max={action.deviceAction === 'set_brightness' ? 100 : 5} value={action.deviceValue ?? 50}
                            onChange={e => updateAction(i, { deviceValue: +e.target.value })}
                            className="w-20 px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                        )}
                      </div>
                    )}
                    {action.type === 'notification' && (
                      <input type="text" placeholder="Notification message..." value={action.message ?? ''}
                        onChange={e => updateAction(i, { message: e.target.value })}
                        className="w-full px-2 py-1.5 rounded text-xs" style={{ background: 'var(--bg-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                    )}
                  </div>
                ))}
                <button onClick={addAction} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>
                  <Plus size={12} />Add Action
                </button>
              </div>

              {/* Settings */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div className="font-medium text-sm mb-3" style={{ color: 'var(--cyan)' }}>C — SETTINGS</div>
                <div className="flex flex-col gap-3">
                  <input type="text" placeholder="Rule name..." value={builder.name}
                    onChange={e => setBuilder(b => ({ ...b, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  <div className="flex gap-2 flex-wrap">
                    {(['comfort','security','energy','custom'] as const).map(c => (
                      <button key={c} onClick={() => setBuilder(b => ({ ...b, category: c }))}
                        className="px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
                        style={{ background: builder.category === c ? `${CAT_COLORS[c]}22` : 'var(--bg-3)', color: builder.category === c ? CAT_COLORS[c] : 'var(--text-muted)', border: builder.category === c ? `1px solid ${CAT_COLORS[c]}` : '1px solid transparent' }}
                      >{c}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setBuilderOpen(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={saveRule} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--cyan)', color: '#000' }}>
                  <Check size={14} />{editId ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
