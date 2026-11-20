const LIVE_FLAGS = [
  "LIVE_TRADING_ENABLED",
  "LIVE_EXECUTION_ENABLED",
  "EXECUTION_ENABLED",
  "ORDER_WRITES_ENABLED",
  "EXCHANGE_WRITE_ENABLED",
];

function isEnabled(value) {
  return /^(1|true|yes|on|enabled)$/i.test(String(value ?? "").trim());
}

export function assertReadOnlyConfiguration(env = process.env) {
  const mode = String(env.TRADING_MODE ?? "READ_ONLY").trim().toUpperCase();
  const orderExecution = String(env.ORDER_EXECUTION_MODE ?? "DISABLED")
    .trim()
    .toUpperCase();
  const enabledFlags = LIVE_FLAGS.filter((flag) => isEnabled(env[flag]));
  if (mode !== "READ_ONLY" || orderExecution !== "DISABLED" || enabledFlags.length) {
    throw new Error("V2_READ_ONLY_POLICY_VIOLATION");
  }
  return Object.freeze({ mode: "READ_ONLY", orderExecution: "DISABLED" });
}

export function denyExchangeWrite() {
  const error = new Error("V2_ORDER_WRITE_FORBIDDEN");
  error.code = "V2_ORDER_WRITE_FORBIDDEN";
  throw error;
}
