/** Public naming alias; serialized legacy chapter1 progress is intentionally preserved. */
export {
  beginChapter1 as beginPrologue,
  chapterEnabled as prologueEnabled,
  advanceChapterLine,
  chapterLines,
  chapterScenes,
} from "./chapter1";
export type { Chapter1Progress as PrologueProgress } from "./chapter1";
