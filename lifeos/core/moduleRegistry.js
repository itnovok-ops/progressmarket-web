/**
 * LifeOS Module Registry — pure telemetry, never throws, never blocks boot.
 */
(function lifeosModuleRegistry(global) {
  "use strict";

  var registry = {
    boot: "unknown",
    render: "unknown",
    video: "unknown",
    nika: "unknown",
    uiMutationLayer: "unknown",
    optionalModules: {
      renderEngine: "unknown",
      analytics: "unknown",
      diagnostics: "unknown",
      performance: "unknown"
    },
    updatedAt: null
  };

  function cloneRegistry() {
    try {
      return JSON.parse(JSON.stringify(registry));
    } catch (_error) {
      return {
        boot: registry.boot,
        render: registry.render,
        video: registry.video,
        nika: registry.nika,
        uiMutationLayer: registry.uiMutationLayer,
        optionalModules: Object.assign({}, registry.optionalModules),
        updatedAt: registry.updatedAt
      };
    }
  }

  function setNested(target, path, value) {
    var parts = String(path).split(".");
    var node = target;
    var i;

    for (i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]] || typeof node[parts[i]] !== "object") {
        node[parts[i]] = {};
      }
      node = node[parts[i]];
    }

    node[parts[parts.length - 1]] = value;
  }

  function updateRegistry(module, status) {
    try {
      if (!module) {
        return cloneRegistry();
      }

      if (module.indexOf("optionalModules.") === 0) {
        setNested(registry, module, status);
      } else if (registry.optionalModules && registry.optionalModules[module]) {
        registry.optionalModules[module] = status;
      } else if (Object.prototype.hasOwnProperty.call(registry, module)) {
        registry[module] = status;
      } else if (module.indexOf(".") > -1) {
        setNested(registry, module, status);
      }

      registry.updatedAt = new Date().toISOString();
      console.log("[LIFEOS REGISTRY] update", { module: module, status: status });
      return cloneRegistry();
    } catch (_error) {
      return cloneRegistry();
    }
  }

  function getStatus() {
    try {
      return cloneRegistry();
    } catch (_error) {
      return { error: "registry_unavailable" };
    }
  }

  global.__LIFEOS_MODULE_REGISTRY__ = registry;
  global.__LIFEOS_REGISTRY_UPDATE__ = updateRegistry;
  global.__LIFEOS_STATUS__ = getStatus;
})(typeof window !== "undefined" ? window : globalThis);
