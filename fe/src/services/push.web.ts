// Web không dùng Expo push.
export async function registerPushDevice(): Promise<void> {}

export async function unregisterPushDevice(): Promise<void> {}

export async function subscribePushTaps(_onData: (data: Record<string, unknown>) => void): Promise<() => void> {
  return () => {};
}
