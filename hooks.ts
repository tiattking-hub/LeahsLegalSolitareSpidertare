import { useState, useEffect, useRef } from 'react';

interface UseVideoPlayerOptions {
  durations: Record<string, number>;
}

interface UseVideoPlayerResult {
  currentScene: number;
}

export function useVideoPlayer({ durations }: UseVideoPlayerOptions): UseVideoPlayerResult {
  const [currentScene, setCurrentScene] = useState(0);
  const sceneKeys = Object.keys(durations);
  const totalScenes = sceneKeys.length;
  const hasStoppedRef = useRef(false);
  const completedPassRef = useRef(false);

  useEffect(() => {
    (window as any).startRecording?.();

    let sceneIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const advance = () => {
      sceneIndex += 1;

      if (sceneIndex >= totalScenes) {
        if (!completedPassRef.current) {
          completedPassRef.current = true;
          if (!hasStoppedRef.current) {
            hasStoppedRef.current = true;
            (window as any).stopRecording?.();
          }
        }
        sceneIndex = 0;
      }

      setCurrentScene(sceneIndex);
      const key = sceneKeys[sceneIndex];
      timeoutId = setTimeout(advance, durations[key]);
    };

    const firstKey = sceneKeys[0];
    timeoutId = setTimeout(advance, durations[firstKey]);

    return () => clearTimeout(timeoutId);
  }, []);

  return { currentScene };
}
