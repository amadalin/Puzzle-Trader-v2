import test from "node:test";
import assert from "node:assert/strict";
import {
  assertReadOnlyConfiguration,
  denyExchangeWrite,
} from "../src/config/safety.mjs";

test("default configuration is read-only", () => {
  assert.deepEqual(assertReadOnlyConfiguration({}), {
    mode: "READ_ONLY",
    orderExecution: "DISABLED",
  });
});

test("explicit safe configuration is accepted", () => {
  const result = assertReadOnlyConfiguration({
    TRADING_MODE: "read_only",
    ORDER_EXECUTION_MODE: "disabled",
    LIVE_TRADING_ENABLED: "false",
  });
  assert.equal(result.mode, "READ_ONLY");
  assert.equal(Object.isFrozen(result), true);
});

test("any enabled exchange-write flag blocks startup", () => {
  for (const flag of [
    "LIVE_TRADING_ENABLED",
    "LIVE_EXECUTION_ENABLED",
    "EXECUTION_ENABLED",
    "ORDER_WRITES_ENABLED",
    "EXCHANGE_WRITE_ENABLED",
  ]) {
    assert.throws(
      () => assertReadOnlyConfiguration({ [flag]: "true" }),
      /V2_READ_ONLY_POLICY_VIOLATION/,
    );
  }
});

test("unsafe trading and order modes block startup", () => {
  assert.throws(
    () => assertReadOnlyConfiguration({ TRADING_MODE: "LIVE" }),
    /V2_READ_ONLY_POLICY_VIOLATION/,
  );
  assert.throws(
    () => assertReadOnlyConfiguration({ ORDER_EXECUTION_MODE: "ENABLED" }),
    /V2_READ_ONLY_POLICY_VIOLATION/,
  );
});

test("order write request is never accepted", () => {
  assert.throws(denyExchangeWrite, { code: "V2_ORDER_WRITE_FORBIDDEN" });
});
