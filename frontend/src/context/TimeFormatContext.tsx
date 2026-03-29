import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  type TimeFormat,
  persistTimeFormat,
  readStoredTimeFormat,
} from "../lib/timeFormat";

type TimeFormatContextValue = {
  timeFormat: TimeFormat;
  setTimeFormat: (f: TimeFormat) => void;
};

const TimeFormatContext = createContext<TimeFormatContextValue | null>(null);

export function TimeFormatProvider({ children }: { children: ReactNode }) {
  const [timeFormat, setFormatState] = useState<TimeFormat>(() =>
    readStoredTimeFormat(),
  );

  const setTimeFormat = useCallback((f: TimeFormat) => {
    persistTimeFormat(f);
    setFormatState(f);
  }, []);

  const value = useMemo(
    () => ({ timeFormat, setTimeFormat }),
    [timeFormat, setTimeFormat],
  );

  return (
    <TimeFormatContext.Provider value={value}>
      {children}
    </TimeFormatContext.Provider>
  );
}

export function useTimeFormat(): TimeFormatContextValue {
  const ctx = useContext(TimeFormatContext);
  if (!ctx) {
    throw new Error("useTimeFormat must be used within TimeFormatProvider");
  }
  return ctx;
}
