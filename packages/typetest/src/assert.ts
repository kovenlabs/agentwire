/** Type-level assertion helpers (no runtime). */

/** Compile error unless `T` is exactly `true`. */
export type Expect<T extends true> = T;

/** Exact type equality (invariant). */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

/** `A` is assignable to `B`. */
export type Extends<A, B> = A extends B ? true : false;
