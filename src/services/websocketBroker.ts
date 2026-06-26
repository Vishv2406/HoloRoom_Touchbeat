// websocketBroker.ts — Production WebSocket/MQTT-over-WS client for HOLOROOM
//
// HOW IT WORKS:
//   1. Tries to connect to a real MQTT broker over WebSocket (ws:// or wss://)
//   2. If the broker is unreachable or times out, falls back to the mock simulator
//   3. Exposes the same publish/subscribe API regardless of which mode is active
//   4. All device state updates flow through this single layer into Zustand
//
// TO CONNECT REAL HARDWARE:
//   Set BROKER_URL to your broker's WebSocket endpoint, e.g.:
//     ws://192.168.1.10:9001        (local Mosquitto with WS enabled)
//     wss://broker.hivemq.com:8884  (HiveMQ public cloud, TLS)
//     wss://your-broker.touchbeat.in:8884
//
// Mosquitto config to enable WebSocket:
//   listener 9001
//   protocol websockets
//   allow_anonymous true

import {
  Topics,
  HOME_ID,
  newRequestId,
  parseDeviceStateTopic,
  parseRoomSensorTopic,
  type DeviceStatePayload,
  type DeviceCommandPayload,
  type RoomSensorPayload,
  type HomeStatusPayload,
} from './mqttProtocol';
import { useHomeStore } from '../store/useHomeStore';
import { mqttSimulator, addToastListener } from './mqttSimulator';

// ── Configuration ─────────────────────────────────────────────────────────

const BROKER_CONFIG = {
  // Change this to your real broker's WebSocket URL to go live:
  url: '',                    // e.g. 'ws://192.168.1.10:9001'
  connectTimeoutMs: 4000,     // how long to wait before falling back to mock
  reconnectDelayMs: 5000,     // delay between reconnect attempts
  maxReconnectAttempts: 5,
  keepAliveIntervalMs: 30000, // ping interval to detect dropped connections
};

// ── Connection state ──────────────────────────────────────────────────────

export type BrokerMode   = 'connecting' | 'connected' | 'mock' | 'disconnected';
export type ConnectionStatus = {
  mode:            BrokerMode;
  brokerUrl:       string;
  reconnectCount:  number;
  lastConnected:   number | null;
  lastError:       string | null;
};

type StatusListener   = (s: ConnectionStatus) => void;
type MessageListener  = (topic: string, payload: unknown) => void;

// ── Minimal MQTT-over-WebSocket implementation ────────────────────────────
// Uses the raw MQTT binary protocol over a native WebSocket.
// No external MQTT library needed — keeps the bundle small.

const MQTT_CONNECT    = 0x10;
const MQTT_CONNACK    = 0x20;
const MQTT_PUBLISH    = 0x30;
const MQTT_SUBSCRIBE  = 0x82;
const MQTT_SUBACK     = 0x90;
const MQTT_PINGREQ    = 0xC0;
const MQTT_PINGRESP   = 0xD0;
const MQTT_DISCONNECT = 0xE0;

function encodeString(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  const out = new Uint8Array(2 + enc.length);
  out[0] = (enc.length >> 8) & 0xff;
  out[1] = enc.length & 0xff;
  out.set(enc, 2);
  return out;
}

function encodeRemLen(n: number): number[] {
  const bytes: number[] = [];
  do {
    let b = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) b |= 0x80;
    bytes.push(b);
  } while (n > 0);
  return bytes;
}

function buildConnectPacket(clientId: string): Uint8Array {
  const protocol   = encodeString('MQTT');
  const cIdBytes   = encodeString(clientId);
  // Variable header: protocol name + level (4) + flags (0x02 = clean session) + keepalive (60s)
  const varHeader  = new Uint8Array([...protocol, 4, 0x02, 0, 60]);
  const payload    = cIdBytes;
  const remLen     = encodeRemLen(varHeader.length + payload.length);
  return new Uint8Array([MQTT_CONNECT, ...remLen, ...varHeader, ...payload]);
}

function buildSubscribePacket(topics: string[], packetId = 1): Uint8Array {
  const topicBytes: number[] = [];
  for (const t of topics) {
    const enc = encodeString(t);
    topicBytes.push(...enc, 0); // QoS 0
  }
  const varHeader  = [0, packetId & 0xff]; // packet identifier
  const remLen     = encodeRemLen(varHeader.length + topicBytes.length);
  return new Uint8Array([MQTT_SUBSCRIBE, ...remLen, ...varHeader, ...topicBytes]);
}

function buildPublishPacket(topic: string, message: string): Uint8Array {
  const topicBytes = encodeString(topic);
  const msgBytes   = new TextEncoder().encode(message);
  const remLen     = encodeRemLen(topicBytes.length + msgBytes.length);
  return new Uint8Array([MQTT_PUBLISH, ...remLen, ...topicBytes, ...msgBytes]);
}

function buildPingReqPacket(): Uint8Array {
  return new Uint8Array([MQTT_PINGREQ, 0]);
}

function buildDisconnectPacket(): Uint8Array {
  return new Uint8Array([MQTT_DISCONNECT, 0]);
}

// ── Broker class ──────────────────────────────────────────────────────────

class HoloroomBroker {
  private ws:                WebSocket | null = null;
  private status:            ConnectionStatus = {
    mode: 'disconnected', brokerUrl: '', reconnectCount: 0,
    lastConnected: null, lastError: null,
  };
  private statusListeners:   StatusListener[]  = [];
  private messageListeners:  MessageListener[] = [];
  private reconnectTimer:    ReturnType<typeof setTimeout> | null = null;
  private keepAliveTimer:    ReturnType<typeof setInterval> | null = null;
  private connectTimeout:    ReturnType<typeof setTimeout> | null = null;
  private packetBuffer:      Uint8Array = new Uint8Array(0);
  private useMock            = false;
  private toastUnsub:        (() => void) | null = null;

  // ── Public API ──────────────────────────────────────────────────────────

  connect(brokerUrl?: string) {
    const url = brokerUrl || BROKER_CONFIG.url;

    if (!url) {
      // No broker URL configured — go straight to mock
      this.startMock('No broker URL configured — running in demo mode');
      return;
    }

    this.setStatus({ mode: 'connecting', brokerUrl: url, lastError: null });
    this.tryConnect(url, 0);
  }

  disconnect() {
    this.clearTimers();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(buildDisconnectPacket()); } catch {}
      this.ws.close();
    }
    this.ws = null;
    if (this.useMock) mqttSimulator.stop();
    this.toastUnsub?.();
    this.setStatus({ mode: 'disconnected' });
  }

  /** Publish a device command to the broker (or no-op in mock mode) */
  publishCommand(roomId: number, deviceId: number, payload: Omit<DeviceCommandPayload, 'requestId' | 'timestamp'>) {
    const full: DeviceCommandPayload = {
      ...payload,
      requestId: newRequestId(),
      timestamp: Date.now(),
    };
    const topic   = Topics.deviceCommand(roomId, deviceId);
    const message = JSON.stringify(full);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(buildPublishPacket(topic, message));
      } catch (e) {
        console.error('[BROKER] Publish failed:', e);
      }
    }
    // In mock mode the UI store already updated — nothing else needed.
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.push(fn);
    fn(this.status); // immediate
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== fn);
    };
  }

  onMessage(fn: MessageListener): () => void {
    this.messageListeners.push(fn);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== fn);
    };
  }

  getStatus(): ConnectionStatus { return { ...this.status }; }

  // ── Private: real WebSocket connection ──────────────────────────────────

  private tryConnect(url: string, attempt: number) {
    this.clearTimers();

    try {
      const clientId = `holoroom_${HOME_ID}_${Date.now().toString(36)}`;
      this.ws = new WebSocket(url, ['mqtt']);
      this.ws.binaryType = 'arraybuffer';

      // Connection timeout — fall back to mock if broker doesn't respond
      this.connectTimeout = setTimeout(() => {
        if (this.status.mode === 'connecting') {
          this.ws?.close();
          this.startMock(`Broker timeout after ${BROKER_CONFIG.connectTimeoutMs}ms — running in demo mode`);
        }
      }, BROKER_CONFIG.connectTimeoutMs);

      this.ws.onopen = () => {
        // Send MQTT CONNECT packet
        this.ws!.send(buildConnectPacket(clientId));
      };

      this.ws.onmessage = (ev) => {
        if (ev.data instanceof ArrayBuffer) {
          this.handleMqttData(new Uint8Array(ev.data));
        }
      };

      this.ws.onerror = () => {
        // onerror always followed by onclose — handle in onclose
      };

      this.ws.onclose = () => {
        this.clearTimers();
        if (this.status.mode === 'connecting') {
          // Never successfully connected
          const nextAttempt = attempt + 1;
          if (nextAttempt < BROKER_CONFIG.maxReconnectAttempts) {
            this.setStatus({ reconnectCount: nextAttempt, lastError: `Connection attempt ${nextAttempt} failed` });
            this.reconnectTimer = setTimeout(
              () => this.tryConnect(url, nextAttempt),
              BROKER_CONFIG.reconnectDelayMs,
            );
          } else {
            this.startMock(`Broker unreachable after ${nextAttempt} attempts — running in demo mode`);
          }
        } else if (this.status.mode === 'connected') {
          // Was connected, dropped — attempt reconnect
          this.setStatus({ mode: 'connecting', lastError: 'Connection lost — reconnecting…' });
          this.reconnectTimer = setTimeout(
            () => this.tryConnect(url, 0),
            BROKER_CONFIG.reconnectDelayMs,
          );
        }
      };

    } catch (err) {
      this.startMock(`WebSocket error — running in demo mode`);
    }
  }

  private handleMqttData(data: Uint8Array) {
    // Append to buffer and process complete packets
    const merged = new Uint8Array(this.packetBuffer.length + data.length);
    merged.set(this.packetBuffer);
    merged.set(data, this.packetBuffer.length);
    this.packetBuffer = merged;

    let offset = 0;
    while (offset < this.packetBuffer.length) {
      if (offset + 1 >= this.packetBuffer.length) break;

      const type = this.packetBuffer[offset] & 0xf0;

      // Decode remaining length
      let remLen = 0, multiplier = 1, lenBytes = 0;
      for (let i = 1; i <= 4; i++) {
        if (offset + i >= this.packetBuffer.length) break;
        const byte = this.packetBuffer[offset + i];
        remLen += (byte & 0x7f) * multiplier;
        multiplier *= 128;
        lenBytes = i;
        if ((byte & 0x80) === 0) break;
      }

      const totalLen = 1 + lenBytes + remLen;
      if (offset + totalLen > this.packetBuffer.length) break; // wait for more data

      const packet = this.packetBuffer.slice(offset, offset + totalLen);
      this.handlePacket(type, packet, 1 + lenBytes, remLen);
      offset += totalLen;
    }
    this.packetBuffer = this.packetBuffer.slice(offset);
  }

  private handlePacket(type: number, packet: Uint8Array, varStart: number, remLen: number) {
    switch (type) {
      case MQTT_CONNACK: {
        clearTimeout(this.connectTimeout!);
        const returnCode = packet[varStart + 1];
        if (returnCode === 0) {
          // Connected successfully
          this.useMock = false;
          this.setStatus({ mode: 'connected', lastConnected: Date.now(), lastError: null, reconnectCount: 0 });
          this.subscribeToTopics();
          this.startKeepAlive();
        } else {
          this.startMock(`MQTT CONNACK error code ${returnCode} — running in demo mode`);
        }
        break;
      }
      case MQTT_PUBLISH: {
        // Decode topic
        const topicLen = (packet[varStart] << 8) | packet[varStart + 1];
        const topicBytes = packet.slice(varStart + 2, varStart + 2 + topicLen);
        const topic = new TextDecoder().decode(topicBytes);
        const payloadBytes = packet.slice(varStart + 2 + topicLen);
        const payloadStr = new TextDecoder().decode(payloadBytes);
        this.handleIncomingMessage(topic, payloadStr);
        break;
      }
      case MQTT_SUBACK:
        // Subscription acknowledged — nothing to do
        break;
      case MQTT_PINGRESP:
        // Keep-alive ack
        break;
    }
  }

  private subscribeToTopics() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const topics = [
      Topics.allDeviceStates(),
      Topics.allRoomSensors(),
      Topics.homeStatus(),
    ];
    this.ws.send(buildSubscribePacket(topics));
  }

  private startKeepAlive() {
    this.keepAliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try { this.ws.send(buildPingReqPacket()); } catch {}
      }
    }, BROKER_CONFIG.keepAliveIntervalMs);
  }

  // ── Private: incoming message handler ──────────────────────────────────

  private handleIncomingMessage(topic: string, payloadStr: string) {
    let payload: unknown;
    try { payload = JSON.parse(payloadStr); } catch { return; }

    // Dispatch to message listeners (for extensions)
    this.messageListeners.forEach(fn => fn(topic, payload));

    // Device state update → Zustand
    const deviceParsed = parseDeviceStateTopic(topic);
    if (deviceParsed) {
      const p = payload as DeviceStatePayload;
      const { updateDevice } = useHomeStore.getState();
      updateDevice(p.deviceId, {
        isOn:         p.isOn,
        brightness:   p.brightness,
        colorTemp:    p.colorTemp,
        speed:        p.speed,
        temperature:  p.temperature,
        mode:         p.mode as any,
        volume:       p.volume,
        energyWatts:  p.energyWatts ?? undefined,
      });
      return;
    }

    // Room sensor update → Zustand
    const sensorParsed = parseRoomSensorTopic(topic);
    if (sensorParsed) {
      const p = payload as RoomSensorPayload;
      const { updateRoomSensor } = useHomeStore.getState() as any;
      updateRoomSensor?.(p.roomId, { temperature: p.temperature, humidity: p.humidity });
      return;
    }

    // Home status
    if (topic === Topics.homeStatus()) {
      const p = payload as HomeStatusPayload;
      if (!p.online) {
        this.setStatus({ lastError: 'Hub went offline' });
      }
    }
  }

  // ── Private: mock fallback ──────────────────────────────────────────────

  private startMock(reason: string) {
    this.useMock = true;
    this.clearTimers();
    this.setStatus({ mode: 'mock', lastError: reason });

    // Wire mock simulator toasts into the same toast system
    this.toastUnsub = addToastListener(() => {
      // Toast listener is already wired in ToastNotification component
    });

    mqttSimulator.start();
  }

  // ── Private: helpers ───────────────────────────────────────────────────

  private clearTimers() {
    if (this.connectTimeout)  clearTimeout(this.connectTimeout);
    if (this.reconnectTimer)  clearTimeout(this.reconnectTimer);
    if (this.keepAliveTimer)  clearInterval(this.keepAliveTimer);
    this.connectTimeout = null;
    this.reconnectTimer = null;
    this.keepAliveTimer = null;
  }

  private setStatus(partial: Partial<ConnectionStatus>) {
    this.status = { ...this.status, ...partial };
    this.statusListeners.forEach(fn => fn({ ...this.status }));
  }
}

// ── Singleton export ───────────────────────────────────────────────────────
export const holoroomBroker = new HoloroomBroker();
