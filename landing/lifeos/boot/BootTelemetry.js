export class BootTelemetry {
  static report = {
    boot_status: "UNKNOWN",
    stage: "init",
    errors: [],
    warnings: [],
    metrics: {
      start_time: performance.now(),
      validation_time_ms: 0,
      assets_checked: 0,
      sections_checked: 0
    },
    context: {
      url: window.location.href,
      user_agent: navigator.userAgent
    }
  };

  static assertBootUnlocked() {
    if (window.__BOOT_STATE__ === "FAIL") {
      throw new Error("BOOT LOCKED");
    }
  }

  static setBootState(state) {
    if (window.__BOOT_STATE__ === "FAIL" && state !== "FAIL") {
      throw new Error("BOOT LOCKED");
    }
    window.__BOOT_STATE__ = state;
  }

  static start() {
    this.assertBootUnlocked();
    this.setBootState("INIT");
    this.report.stage = "boot_start";
    this.report.metrics.start_time = performance.now();
  }

  static addError(code, message, meta = {}) {
    this.report.errors.push({ code, message, severity: "critical", meta });
  }

  static addWarning(code, message, meta = {}) {
    this.report.warnings.push({ code, message, severity: "warning", meta });
  }

  static setStage(stage) {
    this.report.stage = stage;
  }

  static finishValidation() {
    this.report.metrics.validation_time_ms = Math.round(
      performance.now() - this.report.metrics.start_time
    );
  }

  static success() {
    this.assertBootUnlocked();
    this.report.boot_status = "PASS";
    this.report.stage = "ready";
    this.setBootState("PASS");
  }

  static markGatePass() {
    this.assertBootUnlocked();
    this.report.boot_status = "PASS";
    this.report.stage = "gate_pass";
    this.setBootState("PASS");
  }

  static fail(stage = "unknown") {
    this.report.boot_status = "FAIL";
    this.report.stage = stage;
    window.__BOOT_STATE__ = "FAIL";
    console.error("BOOT FAILED:", this.report);
  }

  static getReport() {
    return this.report;
  }
}
