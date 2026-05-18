import { useEffect, useState } from 'react';
import { zegoReadyPromise } from '../../App'; // adjust path if needed

export const useZegoReady = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    zegoReadyPromise.then(() => setIsReady(true));
  }, []);

  return isReady;
};