import { createServer } from "node:http";
import { assertReadOnlyConfiguration } from "./config/safety.mjs";

const safety = assertReadOnlyConfiguration();
const port = Number(process.env.PORT ?? 10000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("V2_INVALID_PORT");
}

const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200);
    response.end(JSON.stringify({
      status: "ok",
      application: "puzzle-trader-v2",
      stage: "01-foundation",
      mode: safety.mode,
      orderExecution: safety.orderExecution,
    }));
    return;
  }
  response.writeHead(404);
  response.end(JSON.stringify({ error: "NOT_FOUND" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log("Puzzle Trader V2 started: READ_ONLY; execution DISABLED");
});
