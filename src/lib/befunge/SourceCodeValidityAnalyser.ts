
export interface IllegalInstruction {
    value: number;
    offset: number;
}

export class SourceCodeValidityAnalyser {
    private static readonly validSymbols = SourceCodeValidityAnalyser.ValidSymbols();

    private sourceCode: string[];

    private sourceCodeLength: number;

    constructor(src: string) {
        this.sourceCode = [...src].reverse();
        this.sourceCodeLength = this.sourceCode.length;
    }

    NextIllegalInstruction(): IllegalInstruction | null {
        if (this.sourceCode.length === 0) {
            return null;
        }

        const illegalInstructionIdx = this.sourceCode
            .findLastIndex(x => !SourceCodeValidityAnalyser.validSymbols.includes(x.charCodeAt(0)));

        if (illegalInstructionIdx === -1) {
            this.sourceCode = [];

            return null;
        }

        const value = this.sourceCode[illegalInstructionIdx].charCodeAt(0);

        this.sourceCode.length = illegalInstructionIdx;

        return { value, offset: this.sourceCodeLength - illegalInstructionIdx + 1 };
    }

    private static ValidSymbols(): number[] {
        const start = ' '.charCodeAt(0);
        const end = '~'.charCodeAt(0);

        return [10, 13, ...Array.from({ length: end - start + 1 }, (_x, n) => n + start)];
    }
}
