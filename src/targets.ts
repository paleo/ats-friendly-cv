import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import type { Cv } from "../types/cv.d.ts";
import type { Target } from "../types/target.d.ts";
import { outputDir, packageDir } from "./constants.ts";
import { loadCv, loadTarget } from "./load.ts";
import { assertValidCv, assertValidTarget } from "./validate.ts";

const DEFAULT_CV_FOLDER = join(packageDir, "cv");
const DEFAULT_CV_PATH = "../cv.json";

/**
 * A validated target with its CV.
 */
export interface LoadedTarget {
  name: string;
  target: Target;
  targetDir: string;
  cv: Cv;
  /**
   * The output directory of the CV folder, shared by its targets.
   */
  cvOutputDir: string;
}

/**
 * Expands the command arguments into target files. A CV folder gives the targets of its `targets/`
 * subdirectory. Without argument, the default CV folder `cv/` is used.
 */
export function listTargetPaths(args: string[]): string[] {
  if (args.length === 0) {
    if (!existsSync(DEFAULT_CV_FOLDER)) {
      throw new Error(
        'No CV folder "cv/" yet. Copy an example ("cp -r examples/starter cv"), or pass a target file or a CV folder.',
      );
    }
    return listFolderTargets(DEFAULT_CV_FOLDER);
  }
  return args.flatMap((arg) => {
    const path = resolve(arg);
    if (!existsSync(path)) throw new Error(`Not found: "${arg}"`);
    return statSync(path).isDirectory() ? listFolderTargets(path) : [path];
  });
}

function listFolderTargets(folder: string): string[] {
  const targetsDir = join(folder, "targets");
  if (!existsSync(targetsDir)) throw new Error(`No "targets" directory in "${folder}"`);
  const paths = readdirSync(targetsDir)
    .filter((file) => extname(file) === ".json")
    .sort()
    .map((file) => join(targetsDir, file));
  if (paths.length === 0) throw new Error(`No target in "${targetsDir}"`);
  return paths;
}

export function loadValidTarget(targetPath: string): LoadedTarget {
  const target = loadTarget(targetPath);
  const targetDir = dirname(targetPath);
  const cvPath = resolve(targetDir, target.cv ?? DEFAULT_CV_PATH);
  const cv = loadCv(cvPath);
  assertValidCv(cv, cvPath);
  assertValidTarget(target, cv, targetPath);
  return {
    name: basename(targetPath, extname(targetPath)),
    target,
    targetDir,
    cv,
    cvOutputDir: join(outputDir, basename(dirname(cvPath))),
  };
}
