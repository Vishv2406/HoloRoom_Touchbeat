// useSceneStore.ts — Scene playback and custom scenes store
import { create } from 'zustand';
import { produce } from 'immer';
import { DEFAULT_SCENES } from '../data/scenes';
import type { Scene } from '../types';
import { useHomeStore } from './useHomeStore';
import { useUIStore } from './useUIStore';

interface SceneState {
  scenes: Scene[];
  isPlayingScene: boolean;
  activeSceneId: number | null;
  sceneProgress: number;
  currentStepIndex: number;
  currentStepName: string;

  playScene: (sceneId: number) => void;
  stopScene: () => void;
  addCustomScene: (scene: Scene) => void;
  updateCustomScene: (sceneId: number, updates: Partial<Scene>) => void;
  deleteCustomScene: (sceneId: number) => void;
  loadCustomScenes: () => void;
  saveCustomScenes: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: DEFAULT_SCENES,
  isPlayingScene: false,
  activeSceneId: null,
  sceneProgress: 0,
  currentStepIndex: 0,
  currentStepName: '',

  playScene: (sceneId) => {
    const { scenes, isPlayingScene, stopScene } = get();
    if (isPlayingScene) stopScene();
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    set({ isPlayingScene: true, activeSceneId: sceneId, sceneProgress: 0, currentStepIndex: 0 });

    const { toggleDevice, updateDevice } = useHomeStore.getState();
    const { addNotification } = useUIStore.getState();
    const totalSteps = scene.steps.length;

    scene.steps.forEach((step, idx) => {
      setTimeout(() => {
        const currentState = get();
        if (!currentState.isPlayingScene || currentState.activeSceneId !== sceneId) return;

        if (step.action === 'on') {
          const device = useHomeStore.getState().getDeviceById(step.deviceId);
          if (device && !device.isOn) toggleDevice(step.deviceId);
          const updates: Record<string, unknown> = {};
          if (step.brightness !== undefined) updates.brightness = step.brightness;
          if (step.speed !== undefined) updates.speed = step.speed;
          if (step.temperature !== undefined) updates.temperature = step.temperature;
          if (step.mode !== undefined) updates.mode = step.mode;
          if (step.volume !== undefined) updates.volume = step.volume;
          if (step.timer !== undefined) updates.timer = step.timer;
          if (Object.keys(updates).length > 0) updateDevice(step.deviceId, updates as Partial<import('../types').Device>);
        } else {
          const device = useHomeStore.getState().getDeviceById(step.deviceId);
          if (device && device.isOn) toggleDevice(step.deviceId);
        }

        const progress = Math.round(((idx + 1) / totalSteps) * 100);
        set({ sceneProgress: progress, currentStepIndex: idx });

        if (idx === totalSteps - 1) {
          setTimeout(() => {
            set({ isPlayingScene: false, activeSceneId: null, sceneProgress: 0 });
            scene.lastActivated = Date.now();
            addNotification(`✅ Scene "${scene.name}" completed!`, 'success');
          }, 800);
        }
      }, step.delay);
    });
  },

  stopScene: () => {
    set({ isPlayingScene: false, activeSceneId: null, sceneProgress: 0, currentStepIndex: 0 });
  },

  addCustomScene: (scene) => {
    set(produce<SceneState>((s) => { s.scenes.push(scene); }));
    get().saveCustomScenes();
  },

  updateCustomScene: (sceneId, updates) => {
    set(produce<SceneState>((s) => {
      const scene = s.scenes.find(sc => sc.id === sceneId);
      if (scene) Object.assign(scene, updates);
    }));
    get().saveCustomScenes();
  },

  deleteCustomScene: (sceneId) => {
    set(produce<SceneState>((s) => { s.scenes = s.scenes.filter(sc => sc.id !== sceneId); }));
    get().saveCustomScenes();
  },

  loadCustomScenes: () => {
    try {
      const stored = localStorage.getItem('holoroom_custom_scenes');
      if (stored) {
        const custom: Scene[] = JSON.parse(stored);
        set(produce<SceneState>((s) => {
          s.scenes = [...DEFAULT_SCENES, ...custom];
        }));
      }
    } catch {}
  },

  saveCustomScenes: () => {
    try {
      const custom = get().scenes.filter(s => s.isCustom);
      localStorage.setItem('holoroom_custom_scenes', JSON.stringify(custom));
    } catch {}
  },
}));
