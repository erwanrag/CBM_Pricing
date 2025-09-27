//src/hooks/useDebounce.js
import { useEffect, useState } from "react";

// 🔁 Hook pour debounce une valeur (utile pour les filtres)
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}
