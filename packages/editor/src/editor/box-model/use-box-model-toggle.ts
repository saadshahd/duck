import { useEffect, useState } from "react";

/** Box-model overlay visibility, reset to hidden whenever the selection moves —
 *  the measurement layer is opt-in per selected element, never sticky. */
export const useBoxModelToggle = (selectedId: string | null) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
  }, [selectedId]);

  return {
    visible,
    toggle: () => setVisible((v) => !v),
  };
};
