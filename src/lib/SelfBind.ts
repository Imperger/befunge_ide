type Callable = (...args: any[]) => any;

type MethodsOnly<T> = Pick<T, { [K in keyof T]: T[K] extends Callable ? K : never }[keyof T]>;

export function SelfBind<TInstance, TMethod extends keyof MethodsOnly<TInstance>>(instance: TInstance, method: TMethod): TInstance[TMethod] {
    return (instance[method] as any).bind(instance);
}
