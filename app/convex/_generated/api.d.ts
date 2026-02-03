/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clueGeneration from "../clueGeneration.js";
import type * as clues from "../clues.js";
import type * as dataImport from "../dataImport.js";
import type * as difficultyClues from "../difficultyClues.js";
import type * as gridGenerator from "../gridGenerator.js";
import type * as prophetKeywords from "../prophetKeywords.js";
import type * as puzzles from "../puzzles.js";
import type * as testing from "../testing.js";
import type * as themeKeywords from "../themeKeywords.js";
import type * as words from "../words.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clueGeneration: typeof clueGeneration;
  clues: typeof clues;
  dataImport: typeof dataImport;
  difficultyClues: typeof difficultyClues;
  gridGenerator: typeof gridGenerator;
  prophetKeywords: typeof prophetKeywords;
  puzzles: typeof puzzles;
  testing: typeof testing;
  themeKeywords: typeof themeKeywords;
  words: typeof words;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
