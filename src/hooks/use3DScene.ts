import { useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';

interface SceneObject {
  id: string;
  type: 'house' | 'tree' | 'lamp';
  position: { x: number; y: number; z: number };
  rotation: Animated.Value;
  bobOffset: number;
}

export const use3DScene = (objectCount = 5) => {
  const objects = useRef<SceneObject[]>([]);
  const bobAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    const sceneObjects: SceneObject[] = [];
    const bobValues: Animated.Value[] = [];

    for (let i = 0; i < objectCount; i++) {
      const bob = new Animated.Value(0);
      bobValues.push(bob);

      sceneObjects.push({
        id: `obj-${i}`,
        type: i % 3 === 0 ? 'house' : i % 3 === 1 ? 'tree' : 'lamp',
        position: {
          x: (i - objectCount / 2) * 1.5,
          y: Math.sin(i * 1.5) * 0.5,
          z: -5 - Math.random() * 3,
        },
        rotation: new Animated.Value(0),
        bobOffset: i * 0.5,
      });
    }

    objects.current = sceneObjects;

    // Start bob animations
    bobValues.forEach((bob) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, {
            toValue: 1,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bob, {
            toValue: 0,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => {
      bobValues.forEach((bob) => bob.setValue(0));
    };
  }, [objectCount]);

  return {
    objects: objects.current,
    bobAnims: bobAnims.current,
    getBobValue: useCallback((index: number) => {
      return bobAnims.current[index] || new Animated.Value(0);
    }, []),
  };
};

export default use3DScene;
