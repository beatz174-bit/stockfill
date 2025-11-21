import { useEffect, useState } from 'react';

export const useServiceWorker = () => {
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => setRegistered(true))
        .catch(() => setRegistered(false));
    }
  }, []);

  return registered;
};
