export async function WaitEvent<TEvent extends Event>(target: HTMLElement, event: string): Promise<TEvent> {
    return new Promise<TEvent>(resolve => target.addEventListener(event, e => resolve(e as TEvent), { once: true }));
}
