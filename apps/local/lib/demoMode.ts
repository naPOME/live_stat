function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

let demoModeEnabled = parseBooleanEnv(process.env.LOCAL_DEMO_MODE);

export function isDemoModeEnabled(): boolean {
  return demoModeEnabled;
}

export function setDemoModeEnabled(enabled: boolean): boolean {
  demoModeEnabled = enabled;
  return demoModeEnabled;
}

export function toggleDemoModeEnabled(): boolean {
  demoModeEnabled = !demoModeEnabled;
  return demoModeEnabled;
}
