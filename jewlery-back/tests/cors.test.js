import { jest } from "@jest/globals";
import { getCorsOptions, isAllowedOrigin } from "../src/config/cors.js";

describe("isAllowedOrigin", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete process.env.CORS_ORIGINS;
  });

  it("allows localhost in development", () => {
    process.env.NODE_ENV = "development";
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:3000")).toBe(true);
  });

  it("allows Railway deploy domains", () => {
    process.env.NODE_ENV = "production";
    expect(isAllowedOrigin("https://jewlery-app.up.railway.app")).toBe(true);
  });

  it("allows origins from CORS_ORIGINS", async () => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGINS = "https://app.example.com, https://admin.example.com/";
    const { isAllowedOrigin: checkOrigin } = await import("../src/config/cors.js");

    expect(checkOrigin("https://app.example.com")).toBe(true);
    expect(checkOrigin("https://admin.example.com")).toBe(true);
  });

  it("blocks unknown origins in production", () => {
    process.env.NODE_ENV = "production";
    expect(isAllowedOrigin("https://evil.example.com")).toBe(false);
  });

  it("allows missing origin", () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
  });
});

describe("getCorsOptions", () => {
  it("accepts allowed origins via callback", () => {
    const options = getCorsOptions();
    const callback = jest.fn();

    options.origin("http://localhost:3000", callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it("rejects blocked origins via callback", () => {
    process.env.NODE_ENV = "production";
    const options = getCorsOptions();
    const callback = jest.fn();

    options.origin("https://blocked.example.com", callback);
    expect(callback).toHaveBeenCalledWith(expect.any(Error));
  });
});
