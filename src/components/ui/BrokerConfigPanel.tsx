// BrokerConfigPanel.tsx — UI to configure and connect to a real MQTT broker
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { holoroomBroker } from '../../services/websocketBroker';
import { useConnectionStatus } from '../../hooks/useBroker';

const STORAGE_KEY = 'holoroom_broker_url';

const PRESET_BROKERS = [
  { label: 'HiveMQ Public (cloud)', url: 'wss://broker.hivemq.com:8884/mqtt' },
  { label: 'EMQX Public (cloud)',   url: 'wss://broker.emqx.io:8084/mqtt'   },
  { label: 'Local Mosquitto',       url: 'ws://localhost:9001'               },
  { label: 'Local EMQX',           url: 'ws://localhost:8083/mqtt'          },
];

export default function BrokerConfigPanel() {
  const status = useConnectionStatus();
  const [url, setUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  const handleConnect = () => {
    localStorage.setItem(STORAGE_KEY, url);
    holoroomBroker.disconnect();
    setTimeout(() => holoroomBroker.connect(url || undefined), 300);
    setSaved(true);
  };

  const handleDisconnect = () => {
    holoroomBroker.disconnect();
    setTimeout(() => holoroomBroker.connect(), 300); // reconnect in mock
  };

  const modeColor = status.mode === 'connected' ? '#4CAF50'
    : status.mode === 'connecting' ? '#FFC107'
    : status.mode === 'mock' ? '#2196F3'
    : '#F44336';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Status row */}
      <div style={{
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${modeColor}33`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: modeColor, display: 'block', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: modeColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {status.mode === 'mock' ? 'Demo Mode' : status.mode}
          </div>
          <div style={{ fontSize: 10, color: '#607080', marginTop: 2 }}>
            {status.mode === 'connected' && `Connected to ${status.brokerUrl}`}
            {status.mode === 'connecting' && 'Attempting connection…'}
            {status.mode === 'mock' && 'No real broker — simulation running'}
            {status.mode === 'disconnected' && 'Not connected'}
          </div>
          {status.lastError && (
            <div style={{ fontSize: 10, color: '#F44336', marginTop: 2 }}>{status.lastError}</div>
          )}
        </div>
        {status.mode === 'connected' && <CheckCircle size={16} color="#4CAF50" />}
        {status.mode === 'connecting' && <RefreshCw size={16} color="#FFC107" style={{ animation: 'spin 1s linear infinite' }} />}
      </div>

      {/* URL input */}
      <div>
        <label style={{ fontSize: 11, color: '#607080', display: 'block', marginBottom: 6, fontWeight: 600 }}>
          MQTT Broker WebSocket URL
        </label>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="ws://192.168.1.10:9001  or  wss://broker.hivemq.com:8884/mqtt"
          onKeyDown={e => e.key === 'Enter' && handleConnect()}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'var(--bg-3)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', fontSize: 12,
            fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 10, color: '#404E5C', marginTop: 5, lineHeight: 1.5 }}>
          Leave empty to use demo simulation. Requires broker with WebSocket support enabled.
        </p>
      </div>

      {/* Preset brokers */}
      <div>
        <div style={{ fontSize: 11, color: '#607080', marginBottom: 8, fontWeight: 600 }}>QUICK PRESETS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {PRESET_BROKERS.map(preset => (
            <button
              key={preset.url}
              onClick={() => setUrl(preset.url)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                background: url === preset.url ? 'rgba(33,150,243,0.1)' : 'var(--bg-3)',
                border: `1px solid ${url === preset.url ? 'rgba(33,150,243,0.3)' : 'var(--border)'}`,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{preset.label}</span>
              <span style={{ fontSize: 10, color: '#506070', fontFamily: 'monospace' }}>
                {preset.url.replace('wss://', '').replace('ws://', '').split('/')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mosquitto setup instructions */}
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8AA0B8', marginBottom: 6 }}>
          🖥️ Self-hosted Mosquitto setup
        </div>
        <pre style={{
          fontSize: 10, color: '#607080', margin: 0, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', fontFamily: 'monospace',
        }}>{`# /etc/mosquitto/mosquitto.conf
listener 1883
listener 9001
protocol websockets
allow_anonymous true`}</pre>
        <p style={{ fontSize: 10, color: '#506070', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0' }}>
          Then set URL to <code style={{ background: 'rgba(255,255,255,0.07)', padding: '0 3px', borderRadius: 3 }}>ws://YOUR_IP:9001</code>
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleConnect}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
            background: 'var(--cyan, #2196F3)', border: 'none',
            color: '#000', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {saved ? <><CheckCircle size={14} /> Saved!</> : <><Wifi size={14} /> Connect</>}
        </button>
        {status.mode === 'connected' && (
          <button
            onClick={handleDisconnect}
            style={{
              padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
              background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.25)',
              color: '#F44336', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <WifiOff size={14} /> Disconnect
          </button>
        )}
      </div>

      {/* Topic structure info */}
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8AA0B8', marginBottom: 6 }}>
          📡 MQTT Topic Schema
        </div>
        <pre style={{ fontSize: 9.5, color: '#506070', margin: 0, lineHeight: 1.8, fontFamily: 'monospace' }}>{`State   : home/{homeId}/room/{roomId}/device/{deviceId}/state
Command : home/{homeId}/room/{roomId}/device/{deviceId}/command
Sensor  : home/{homeId}/room/{roomId}/sensor
Status  : home/{homeId}/status`}</pre>
      </div>
    </div>
  );
}
