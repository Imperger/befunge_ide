import { injectable } from "inversify";

import { Effect } from "./Effect";

import { Inversify } from "@/Inversify";

@injectable()
export class EffectRunner {
    private effects: Effect[] = [];

    Register(effect: Effect): void {
        this.effects.push(effect);
    }

    Draw(elapsed: number): boolean {
        for (let n = 0; n < this.effects.length; ++n) {
            const effect = this.effects[n];

            if (effect.IsDone) {
                this.effects.splice(n--, 1);
            } else {
                effect.Draw(elapsed);
            }
        }

        return this.effects.length > 0;
    }
}

Inversify.bind(EffectRunner).toSelf().inSingletonScope();
