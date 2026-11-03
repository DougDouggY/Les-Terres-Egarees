/** Prototype only. Production releases omit VITE_PROTOTYPE_TOOLS entirely. */
export const prototypeTools =
  import.meta.env.DEV || import.meta.env.VITE_PROTOTYPE_TOOLS === "true";
