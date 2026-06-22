import { docs } from "@/.source";
import { loader } from "fumadocs-core/source";

const mdxSource = docs.toFumadocsSource();

// Runtime compat: some `fumadocs-mdx` releases expose `source.files` as a
// function, while this `fumadocs-core` build iterates it as an array. Resolve it
// in place — the static type (and the loader's inferred page data) is unaffected.
{
  const filesProp = (mdxSource as { files: unknown }).files;
  if (typeof filesProp === "function") {
    (mdxSource as { files: unknown }).files = (filesProp as () => unknown)();
  }
}

export const source = loader({
  baseUrl: "/docs",
  source: mdxSource,
});
