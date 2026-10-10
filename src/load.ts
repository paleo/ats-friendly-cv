import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createValidator, type TypeOnlyValidator } from "@typeonly/validator";
import type { Cv } from "../types/cv.d.ts";
import type { Labels } from "../types/labels.d.ts";
import type { Target } from "../types/target.d.ts";
import { distDir } from "./constants.ts";

const BUNDLE_PATH = join(distDir, "types.to.json");

let validator: TypeOnlyValidator | undefined;

export function loadCv(path: string): Cv {
  const data = readJsonFile(path);
  assertConform<Cv>(data, "Cv", path);
  return data;
}

export function loadTarget(path: string): Target {
  const data = readJsonFile(path);
  assertConform<Target>(data, "Target", path);
  return data;
}

export function loadLabels(path: string): Labels {
  const data = readJsonFile(path);
  assertConform<Labels>(data, "Labels", path);
  return data;
}

function readJsonFile(path: string): unknown {
  if (!existsSync(path)) throw new Error(`File not found: "${path}"`);
  const content = readFileSync(path, "utf8");
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in "${path}": ${errorMessage(error)}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertConform<T>(data: unknown, typeName: string, path: string): asserts data is T {
  const result = getValidator().validate(typeName, data);
  if (!result.valid) throw new Error(`Invalid format in "${path}":\n${result.error}`);
}

function getValidator(): TypeOnlyValidator {
  validator ??= createValidator({ bundle: readBundle() });
  return validator;
}

function readBundle(): unknown {
  if (!existsSync(BUNDLE_PATH)) {
    throw new Error(`TypeOnly bundle not found (${BUNDLE_PATH}): run "npm run typeonly".`);
  }
  return JSON.parse(readFileSync(BUNDLE_PATH, "utf8"));
}
