import {
  getMetricsContentType,
  getMetricsPayload,
  metricsMiddleware,
} from "../src/observability/metrics.js";

describe("metrics observability", () => {
  it("exposes prometheus metrics payload", async () => {
    const payload = await getMetricsPayload();
    expect(payload).toContain("jewelry_http_requests_total");
    expect(payload).toContain("jewelry_api_process_cpu_user_seconds_total");
  });

  it("tracks request duration via middleware", async () => {
    const req = { method: "GET", path: "/health", route: { path: "/health" }, baseUrl: "" };
    const listeners = {};

    const res = {
      statusCode: 200,
      on(event, handler) {
        listeners[event] = handler;
      },
    };

    metricsMiddleware(req, res, () => {});
    listeners.finish();

    const payload = await getMetricsPayload();
    expect(payload).toContain('route="/health"');
    expect(getMetricsContentType()).toContain("text/plain");
  });
});
