export const APP_CONFIG = {
  name: "Data Eater",
  version: "1.2.0",
  company: "Robertet",
  timezone: "Europe/Paris", // Grasse Time
};

export const CONSTITUTION = {
  ZERO_DATA_LOSS: true,
  READ_ONLY_SOURCE: true,
  SAFETY_THRESHOLD_PERCENT: 5, // Trigger alert if >5% rows deleted
  DEFAULT_ENCODING_EXPORT: "windows-1252", // AS400 Compatibility
};

export const MASCOT_STATES = {
  SLEEPING: 'sleeping',
  EATING: 'eating',
  COOKING: 'cooking',
  DETECTIVE: 'detective',
  INDIGESTION: 'indigestion',
} as const;

export type MascotState = typeof MASCOT_STATES[keyof typeof MASCOT_STATES];
