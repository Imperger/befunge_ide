export function EnumSize<T extends object>(e: T): number {
    return Object.keys(e).length >> 1;
}
