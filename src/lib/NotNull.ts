export function NotNull(msg: string): never {
  throw new Error(msg);
}
