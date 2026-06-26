// aiService.ts — Main AI service: pre-flight bulk resolver + AI tool loop
import { getAIProvider, type AIStreamChunk } from './aiProvider';
import { AI_TOOLS, executeFunctionCall } from './aiFunctions';
import { buildHomeContext } from './aiContextBuilder';
import { SYSTEM_COPILOT, SYSTEM_VOICE, SYSTEM_SCENE_GENERATOR } from './aiPrompts';
import { getChatHistory, addChatMessage, recordCommand, getMemoryContext } from './aiMemory';
import type { AIMessage } from './aiProvider';

export interface CopilotResponse {
  text: string;
  functionResults: { name: string; result: string }[];
}

// ── Smart context builder ─────────────────────────────────────────────────────

function buildSmartContext(userMessage: string): string {
  const ctx   = buildHomeContext();
  const lower = userMessage.toLowerCase();

  const lines: string[] = [
    `HOME: ${ctx.homeName} | Power: ${Math.round(ctx.totalPower)}W | Active: ${ctx.activeDevices} devices`,
    `ENERGY: Daily ~${ctx.energySummary.dailyKwh.toFixed(1)} kWh | Monthly ~₹${Math.round(ctx.energySummary.monthlyRs)}`,
    `TOP CONSUMERS: ${ctx.energySummary.topConsumers.map(c => `${c.name}(${Math.round(c.watts)}W in ${c.room})`).join(', ')}`,
  ];

  const wantsEnergy  = /energy|power|watt|cost|expensive|bill|usage|consum/i.test(lower);
  const wantsDevices = /light|fan|ac|air\s*con|tv|geyser|device|turn|switch|off|on|plug|exhaust/i.test(lower);
  const wantsScenes  = /scene|mode|movie|sleep|gaming|study|night|morning/i.test(lower);
  const wantsAuto    = /automat|schedul|trigger|rule|every day|every night|when/i.test(lower);

  // Always show ALL rooms/devices for any device or room-related query
  if (wantsDevices || wantsEnergy ||
      /room|bedroom|kitchen|living|bathroom|balcony|corridor|store|wash|passage|all/i.test(lower)) {
    lines.push('', 'ROOMS & DEVICES:');
    for (const room of ctx.rooms) {
      lines.push(`  [roomId:${room.id}] ${room.name} | ${room.temperature}°C | ${room.activeDevices} on | ${Math.round(room.totalWatts)}W`);
      if (wantsDevices || wantsEnergy) {
        for (const d of room.devices) {
          const s = d.isOn ? `ON ${Math.round(d.watts)}W${d.settings ? ' ('+d.settings+')' : ''}` : 'OFF';
          lines.push(`    [deviceId:${d.id}] ${d.name} (${d.type}): ${s}`);
        }
      }
    }
    // Explicit device+room ID list for quick lookup
    const allDeviceIds = ctx.rooms.flatMap(r =>
      r.devices.map(d => `[${d.id}]${d.name}(${d.type},${r.name})`)
    ).join(', ');
    lines.push('', `ALL_DEVICES: ${allDeviceIds.slice(0, 1200)}`);
    lines.push(`ALL_ROOMS: ${ctx.rooms.map(r => `[${r.id}]${r.name}`).join(', ')}`);
  }

  if (wantsScenes) {
    lines.push('', 'SCENES: ' + ctx.scenes.map(s => `${s.emoji}${s.name}[id:${s.id}]`).join(', '));
  }

  if (wantsAuto) {
    lines.push('', 'AUTOMATIONS: ' + (ctx.automations.length
      ? ctx.automations.map(a => `${a.name}[id:${a.id}] ${a.isEnabled ? '✓' : '✗'}`).join(', ')
      : 'none'));
  }

  const full = lines.join('\n');
  return full.length > 3500 ? full.slice(0, 3500) + '\n...' : full;
}

// ── Pre-flight bulk intent detector ──────────────────────────────────────────
// Handles unambiguous bulk commands LOCALLY — zero AI round-trips, no rate limits

interface ToolCall { name: string; arguments: Record<string, unknown> }

function detectBulkIntent(userMessage: string): ToolCall[] | null {
  const raw   = userMessage.trim();
  const lower = raw.toLowerCase()
    // Normalise common typos
    .replace(/\btrun\b/g, 'turn')
    .replace(/\bdevuices?\b/g, 'devices')
    .replace(/\bligths?\b/g, 'lights');

  const ctx = buildHomeContext();

  // ── 1. ALL DEVICES (entire home) ─────────────────────────────────────────
  // "turn off all devices", "turn off everything", "everything off", "all devices off"
  const allDevOff = /turn\s+off\s+(all\s+)?(home\s+)?(devices?|everything)|everything\s+off|(all\s+)?devices?\s+off/i.test(lower);
  const allDevOn  = /turn\s+on\s+(all\s+)?(home\s+)?(devices?|everything)|everything\s+on|(all\s+)?devices?\s+on/i.test(lower);
  if (allDevOff) return [{ name: 'toggleAllDevices', arguments: { state: 'off' } }];
  if (allDevOn)  return [{ name: 'toggleAllDevices', arguments: { state: 'on'  } }];

  // ── 2. LIGHTS ONLY (all rooms) ────────────────────────────────────────────
  // "turn on/off all lights", "turn on only lights", "turn off lights everywhere"
  // Must NOT match "all devices" — lights-specific
  const lightsOnlyOff = /turn\s+off\s+(all\s+|only\s+)?lights?(\s+(everywhere|in\s+all\s+rooms?|of\s+all\s+rooms?))?$|^(all\s+)?lights?\s+off$/i.test(lower);
  const lightsOnlyOn  = /turn\s+on\s+(all\s+|only\s+)?lights?(\s+(everywhere|in\s+all\s+rooms?|of\s+all\s+rooms?))?$|^(all\s+)?lights?\s+on$/i.test(lower);

  if (lightsOnlyOff || lightsOnlyOn) {
    const targetState = lightsOnlyOff ? 'off' : 'on';
    const lightCalls: ToolCall[] = [];
    for (const room of ctx.rooms) {
      for (const device of room.devices) {
        if (device.type === 'light' && device.isOn !== (targetState === 'on')) {
          lightCalls.push({ name: 'toggleDevice', arguments: { deviceId: device.id, state: targetState } });
        }
      }
    }
    // If nothing to change, still confirm with a single no-op summary
    return lightCalls.length > 0 ? lightCalls : [{ name: '_noop', arguments: { msg: `All lights are already ${targetState}.` } }];
  }

  // ── 3. FANS ONLY (all rooms) ──────────────────────────────────────────────
  const fansOff = /turn\s+off\s+(all\s+)?fans?(\s+(everywhere|in\s+all\s+rooms?))?$/i.test(lower);
  const fansOn  = /turn\s+on\s+(all\s+)?fans?(\s+(everywhere|in\s+all\s+rooms?))?$/i.test(lower);
  if (fansOff || fansOn) {
    const targetState = fansOff ? 'off' : 'on';
    const calls: ToolCall[] = [];
    for (const room of ctx.rooms)
      for (const d of room.devices)
        if (d.type === 'fan' && d.isOn !== (targetState === 'on'))
          calls.push({ name: 'toggleDevice', arguments: { deviceId: d.id, state: targetState } });
    return calls.length > 0 ? calls : [{ name: '_noop', arguments: { msg: `All fans are already ${targetState}.` } }];
  }

  // ── 4. ACs ONLY (all rooms) ───────────────────────────────────────────────
  const acsOff = /turn\s+off\s+(all\s+)?a\.?c\.?s?(\s+(everywhere|in\s+all\s+rooms?))?$/i.test(lower);
  const acsOn  = /turn\s+on\s+(all\s+)?a\.?c\.?s?(\s+(everywhere|in\s+all\s+rooms?))?$/i.test(lower);
  if (acsOff || acsOn) {
    const targetState = acsOff ? 'off' : 'on';
    const calls: ToolCall[] = [];
    for (const room of ctx.rooms)
      for (const d of room.devices)
        if (d.type === 'ac' && d.isOn !== (targetState === 'on'))
          calls.push({ name: 'toggleDevice', arguments: { deviceId: d.id, state: targetState } });
    return calls.length > 0 ? calls : [{ name: '_noop', arguments: { msg: `All ACs are already ${targetState}.` } }];
  }

  // ── 5. SINGLE ROOM — all devices ─────────────────────────────────────────
  for (const room of ctx.rooms) {
    const rn = room.name.toLowerCase();
    const roomOff = new RegExp(
      `turn\\s+off\\s+(all\\s+)?${rn}\\s*(devices?|lights?|everything)?$|` +
      `all\\s+${rn}\\s*(devices?)?\\s+off$|${rn}\\s+off$`, 'i'
    );
    const roomOn  = new RegExp(
      `turn\\s+on\\s+(all\\s+)?${rn}\\s*(devices?|lights?|everything)?$|` +
      `all\\s+${rn}\\s*(devices?)?\\s+on$|${rn}\\s+on$`, 'i'
    );
    if (roomOff.test(lower)) return [{ name: 'toggleAllDevicesInRoom', arguments: { roomId: room.id, roomName: room.name, state: 'off' } }];
    if (roomOn.test(lower))  return [{ name: 'toggleAllDevicesInRoom', arguments: { roomId: room.id, roomName: room.name, state: 'on'  } }];
  }

  // ── 6. SINGLE DEVICE in SPECIFIC ROOM ────────────────────────────────────
  // "turn on AC", "turn on bedroom light", "turn on kitchen fan" etc.
  // Only handle if we can find an EXACT match — else let AI handle ambiguity
  const turnOnMatch  = lower.match(/^turn\s+on\s+(?:the\s+)?(.+)$/);
  const turnOffMatch = lower.match(/^turn\s+off\s+(?:the\s+)?(.+)$/);
  const deviceMatch  = turnOnMatch || turnOffMatch;
  const targetState2 = turnOnMatch ? 'on' : 'off';

  if (deviceMatch) {
    const query = deviceMatch[1].trim();
    // Try to find exact device by type or name across rooms
    let foundDevice: { id: number; name: string } | null = null;
    let foundRoom: string | null = null;

    for (const room of ctx.rooms) {
      for (const d of room.devices) {
        const dType = d.type.toLowerCase();
        const dName = d.name.toLowerCase();
        const rName = room.name.toLowerCase();

        // Match patterns like "ac", "fan", "light", "bedroom ac", "living room fan"
        if (
          query === dType ||
          query === dName ||
          query === `${rName} ${dType}` ||
          query === `${rName} ${dName}` ||
          query.includes(rName) && (query.includes(dType) || query.includes(dName))
        ) {
          if (!foundDevice) {
            foundDevice = { id: d.id, name: d.name };
            foundRoom = room.name;
          } else {
            // Ambiguous — multiple matches, let AI handle
            foundDevice = null;
            break;
          }
        }
      }
      if (foundDevice === null && foundRoom !== null) break;
    }

    if (foundDevice) {
      return [{ name: 'toggleDevice', arguments: { deviceId: foundDevice.id, state: targetState2 } }];
    }
  }

  return null; // Let AI handle
}

// ── withRetry — exponential backoff, longer waits for 429 ────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : '';
      const isRateLimit = msg.includes('Rate limit') || msg.includes('429') || msg.includes('⏳');
      const isTimeout   = msg.includes('timed out') || msg.includes('⏱️');
      if ((isRateLimit || isTimeout) && i < maxRetries) {
        // Exponential backoff: 3s, 6s, 12s for rate limits; 2s, 4s for timeouts
        const wait = isRateLimit ? 3000 * Math.pow(2, i) : 2000 * (i + 1);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ── Safe done-signal wrapper ──────────────────────────────────────────────────

function makeSafeOnChunk(onChunk: (delta: string, done: boolean) => void) {
  let finished = false;
  return {
    safe: (delta: string, done: boolean) => {
      if (finished) return;
      if (done) { finished = true; onChunk(delta, true); }
      else onChunk(delta, false);
    },
    finish: (text = '') => {
      if (!finished) { finished = true; onChunk(text, true); }
    },
  };
}

// ── Main tool-loop executor ───────────────────────────────────────────────────

async function runToolLoop(
  messages: AIMessage[],
  safeOnChunk: (delta: string, done: boolean) => void,
  preflight?: ToolCall[],
): Promise<{ text: string; functionResults: { name: string; result: string }[] }> {
  const functionResults: { name: string; result: string }[] = [];

  // ── Pre-flight: execute bulk calls locally, no AI needed ──────────────────
  if (preflight && preflight.length > 0) {
    for (const call of preflight) {
      if (call.name === '_noop') {
        // Already-correct state — just return the message
        const msg = String(call.arguments.msg ?? '✅ Already done.');
        safeOnChunk(msg, true);
        return { text: msg, functionResults: [] };
      }
      const exec = executeFunctionCall(call.name, call.arguments);
      functionResults.push({ name: call.name, result: exec.message });
    }

    // Build a clean, concise summary (no duplicate ✅ lines for large batches)
    let summary: string;
    if (functionResults.length === 1) {
      summary = `✅ ${functionResults[0].result}`;
    } else {
      // Group by result message to avoid 13-line lists
      const unique = [...new Set(functionResults.map(r => r.result))];
      if (unique.length <= 3) {
        summary = unique.map(r => `✅ ${r}`).join('\n');
      } else {
        // Summarise: "X devices changed"
        const firstResult = functionResults[0].result;
        const deviceType  = firstResult.includes('light') ? 'lights' :
                            firstResult.includes('fan')   ? 'fans'   :
                            firstResult.includes('AC')    ? 'ACs'    : 'devices';
        const state = firstResult.toLowerCase().includes('turned on') ? 'on' : 'off';
        summary = `✅ ${functionResults.length} ${deviceType} turned ${state}`;
      }
    }
    safeOnChunk(summary, true);
    return { text: summary, functionResults };
  }

  // ── AI tool loop ───────────────────────────────────────────────────────────
  const provider = getAIProvider()!;
  let fullText = '';
  const maxRounds = 6;
  let currentMessages = [...messages];

  for (let round = 0; round < maxRounds; round++) {
    let roundToolCall: ToolCall | null = null;
    let roundText = '';

    await withRetry(() =>
      provider.stream(currentMessages, AI_TOOLS, (chunk: AIStreamChunk) => {
        if (chunk.toolCall) {
          roundToolCall = chunk.toolCall;
        } else if (chunk.delta && !chunk.done) {
          roundText += chunk.delta;
          fullText  += chunk.delta;
          safeOnChunk(chunk.delta, false);
        }
      })
    );

    if (roundToolCall) {
      const tc = roundToolCall as ToolCall;
      const exec = executeFunctionCall(tc.name, tc.arguments);
      functionResults.push({ name: tc.name, result: exec.message });

      currentMessages = [
        ...currentMessages,
        {
          role: 'assistant' as const,
          content: roundText || '',
          // @ts-ignore
          tool_calls: [{ id: `call_${round}`, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } }],
        },
        {
          role: 'tool' as const,
          // @ts-ignore
          tool_call_id: `call_${round}`,
          content: exec.message,
        },
      ];
    } else {
      break; // Model returned text — done
    }
  }

  // Guarantee non-empty response
  if (functionResults.length > 0 && !fullText.trim()) {
    // Build terse summary — don't repeat every device individually
    if (functionResults.length === 1) {
      fullText = `✅ ${functionResults[0].result}`;
    } else {
      const state = functionResults[0].result.toLowerCase().includes('turned on') ? 'on' : 'off';
      fullText = `✅ ${functionResults.length} actions completed (all turned ${state})`;
    }
    safeOnChunk(fullText, true);
  } else if (fullText.trim()) {
    safeOnChunk('', true);
  } else {
    fullText = '✅ Done.';
    safeOnChunk(fullText, true);
  }

  return { text: fullText, functionResults };
}

// ── Main copilot entry point ──────────────────────────────────────────────────

export async function copilotChat(
  userMessage: string,
  onChunk: (delta: string, done: boolean) => void,
): Promise<CopilotResponse> {
  recordCommand(userMessage);

  const { safe, finish } = makeSafeOnChunk(onChunk);
  const provider = getAIProvider();

  if (!provider?.isAvailable()) {
    const fallback = getOfflineFallback(userMessage);
    safe(fallback, true);
    return { text: fallback, functionResults: [] };
  }

  const preflight  = detectBulkIntent(userMessage);
  const contextStr = buildSmartContext(userMessage);
  const memCtx     = getMemoryContext();
  const history    = getChatHistory().slice(-4).map(m => ({ role: m.role, content: m.content } as AIMessage));

  const systemContent = [
    SYSTEM_COPILOT,
    '\nCURRENT HOME STATE:\n' + contextStr,
    memCtx ? '\nUSER PREFS:\n' + memCtx.slice(0, 200) : '',
  ].join('');

  const messages: AIMessage[] = [
    { role: 'system', content: systemContent },
    ...history,
    { role: 'user', content: userMessage },
  ];

  try {
    const { text, functionResults } = await runToolLoop(messages, safe, preflight ?? undefined);
    addChatMessage({ role: 'user',      content: userMessage, timestamp: Date.now() });
    addChatMessage({ role: 'assistant', content: text,        timestamp: Date.now(), functionCalls: functionResults });
    return { text, functionResults };
  } catch (err) {
    const msg = `⚠️ ${err instanceof Error ? err.message : 'AI unavailable. Please try again.'}`;
    finish(msg);
    return { text: msg, functionResults: [] };
  } finally {
    finish(); // nuclear guarantee
  }
}

// ── Voice AI ──────────────────────────────────────────────────────────────────

export async function processVoiceWithAI(transcript: string): Promise<string> {
  const provider = getAIProvider();
  if (!provider?.isAvailable()) return '';

  const preflight = detectBulkIntent(transcript);
  if (preflight && preflight.length > 0) {
    if (preflight[0].name === '_noop') return String(preflight[0].arguments.msg ?? 'Done.');
    const results: string[] = [];
    for (const call of preflight) {
      const exec = executeFunctionCall(call.name, call.arguments);
      results.push(exec.message);
    }
    return results.length === 1 ? results[0] : `${results.length} actions done`;
  }

  const ctx = buildSmartContext(transcript);
  const messages: AIMessage[] = [
    { role: 'system', content: `${SYSTEM_VOICE}\n\nHOME STATE:\n${ctx.slice(0, 1200)}` },
    { role: 'user',   content: transcript },
  ];
  try {
    const result = await withRetry(() => provider.chat(messages, AI_TOOLS));
    if (result.startsWith('{') && result.includes('toolCalls')) {
      const parsed = JSON.parse(result);
      const tc = parsed.toolCalls?.[0];
      if (tc?.function) {
        const args = JSON.parse(tc.function.arguments ?? '{}');
        return executeFunctionCall(tc.function.name, args).message;
      }
    }
    return result;
  } catch { return ''; }
}

// ── Automation builder ────────────────────────────────────────────────────────

export async function buildAutomationFromNL(description: string): Promise<string> {
  const provider = getAIProvider();
  if (!provider?.isAvailable()) return '⚠️ AI not configured. Add your Groq API key in the AI panel.';

  const ctx        = buildHomeContext();
  const deviceList = ctx.rooms.flatMap(r => r.devices.map(d => `[${d.id}]${d.name}(${d.type}) in ${r.name}`)).join(', ').slice(0, 800);
  const messages: AIMessage[] = [
    { role: 'system', content: `You are an automation builder. Create rules using createAutomation function.\nDevices: ${deviceList}\nDays: 0=Sun..6=Sat. Time: HH:MM (24h).` },
    { role: 'user',   content: `Create: ${description}` },
  ];
  try {
    const result = await withRetry(() => provider.chat(messages, AI_TOOLS));
    if (result.startsWith('{') && result.includes('toolCalls')) {
      const parsed = JSON.parse(result);
      const tc     = parsed.toolCalls?.[0];
      if (tc?.function?.name === 'createAutomation') {
        const args = JSON.parse(tc.function.arguments ?? '{}');
        const exec = executeFunctionCall('createAutomation', args);
        return exec.success ? `✅ ${exec.message}` : `❌ ${exec.message}`;
      }
    }
    return result || '⚠️ Could not parse automation';
  } catch (err) { return `❌ ${err instanceof Error ? err.message : 'Error'}`; }
}

// ── Scene generator ───────────────────────────────────────────────────────────

export async function generateSceneWithAI(prompt: string): Promise<string> {
  const provider = getAIProvider();
  if (!provider?.isAvailable()) return '⚠️ AI not configured. Add your Groq API key in the AI panel.';

  const ctx        = buildHomeContext();
  const deviceList = ctx.rooms.flatMap(r => r.devices.map(d => `[${d.id}]${d.name}(${d.type})`)).join(', ').slice(0, 600);
  const messages: AIMessage[] = [
    { role: 'system', content: `${SYSTEM_SCENE_GENERATOR}\nDevices: ${deviceList}` },
    { role: 'user',   content: `Create scene: ${prompt}` },
  ];
  try {
    const result = await withRetry(() => provider.chat(messages, AI_TOOLS));
    if (result.startsWith('{') && result.includes('toolCalls')) {
      const parsed = JSON.parse(result);
      const tc     = parsed.toolCalls?.[0];
      if (tc?.function?.name === 'createScene') {
        const args = JSON.parse(tc.function.arguments ?? '{}');
        const exec = executeFunctionCall('createScene', args);
        return exec.success ? `✅ ${exec.message}` : `❌ ${exec.message}`;
      }
    }
    return result || '⚠️ Could not generate scene';
  } catch (err) { return `❌ ${err instanceof Error ? err.message : 'Error'}`; }
}

// ── Offline fallback ──────────────────────────────────────────────────────────

function getOfflineFallback(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('energy') || lower.includes('power')) {
    const ctx = buildHomeContext();
    const top = ctx.energySummary.topConsumers[0];
    return `**Current Power:** ${Math.round(ctx.totalPower)}W | ${ctx.activeDevices} devices on\n**Top consumer:** ${top ? top.name + ' (' + Math.round(top.watts) + 'W)' : 'None'}\n\n_Add your Groq API key for full AI analysis._`;
  }
  if (/hello|hi\b|hey/.test(lower)) return `Hello! I'm HoloRoom AI. Add your Groq API key to unlock full smart home control.`;
  return `I'm in offline mode. Add your Groq API key to enable AI control, automations, and energy insights.`;
}
