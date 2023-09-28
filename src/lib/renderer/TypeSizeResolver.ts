type SupportedTypes<T extends readonly (readonly [GLenum, number])[]> =
  T[number][0];

export class TypeSizeResolver {
  private static readonly Sizes = [
    [window.WebGL2RenderingContext.BYTE, Int8Array.BYTES_PER_ELEMENT] as const,
    [
      window.WebGL2RenderingContext.SHORT,
      Int16Array.BYTES_PER_ELEMENT
    ] as const,
    [
      window.WebGL2RenderingContext.UNSIGNED_BYTE,
      Uint8Array.BYTES_PER_ELEMENT
    ] as const,
    [
      window.WebGL2RenderingContext.UNSIGNED_SHORT,
      Uint16Array.BYTES_PER_ELEMENT
    ] as const,
    [
      window.WebGL2RenderingContext.FLOAT,
      Float32Array.BYTES_PER_ELEMENT
    ] as const,
    [window.WebGL2RenderingContext.HALF_FLOAT, 2] as const,
    [window.WebGL2RenderingContext.INT, Int32Array.BYTES_PER_ELEMENT] as const,
    [
      window.WebGL2RenderingContext.UNSIGNED_INT,
      Uint32Array.BYTES_PER_ELEMENT
    ] as const,
    [
      window.WebGL2RenderingContext.INT_2_10_10_10_REV,
      Int32Array.BYTES_PER_ELEMENT
    ] as const,
    [
      window.WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV,
      Int32Array.BYTES_PER_ELEMENT
    ] as const
  ] as const;

  public static Resolve(
    type: SupportedTypes<typeof TypeSizeResolver.Sizes>
  ): number {
    return (
      TypeSizeResolver.Sizes.find(x => x[0] === type) as [GLenum, number]
    )[1];
  }
}
