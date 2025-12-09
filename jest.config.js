const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    ...tsJestTransformCfg,
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
};
