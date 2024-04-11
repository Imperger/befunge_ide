export type ArrayItemType<T extends any[]> = T extends (infer U)[] ? U : never;
