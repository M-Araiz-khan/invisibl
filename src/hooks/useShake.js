import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';

export const useShake = (onShakeCallback) => {
  // Keep a stable reference to the latest callback
  const callbackRef = useRef(onShakeCallback);
  useEffect(() => {
    callbackRef.current = onShakeCallback;
  }, [onShakeCallback]);

  // Cooldown flag to prevent multiple triggers from one shake
  const isShakingRef = useRef(false);

  useEffect(() => {
    // Set update interval before starting the listener
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const totalForce = Math.sqrt(x * x + y * y + z * z);

      if (totalForce > 2.5) {
        // Trigger only if not already in a cooldown period
        if (!isShakingRef.current) {
          isShakingRef.current = true;
          callbackRef.current(); // Call the latest callback

          // Reset the flag after 1 second (adjust as needed)
          setTimeout(() => {
            isShakingRef.current = false;
          }, 1000);
        }
      }
    });

    // Cleanup: remove the listener when the component unmounts
    return () => {
      subscription.remove();
    };
  }, []); // ✅ Runs only once on mount
};