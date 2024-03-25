export class IOPort {
  private input: string[] = [];

  private output: string[] = [];

  InputWrite(data: string): void {
    this.input.push(...data);
  }

  InputReadCharacter(): string {
    if (this.input.length === 0) {
      throw new Error('Failed to read from IO port');
    }

    return this.input.shift()!;
  }

  InputReadNumber(): number {
    let nonSpaceIdx = this.input.findIndex(x => x !== ' ');

    if (['-', '+'].includes(this.input[nonSpaceIdx])) {
      ++nonSpaceIdx;
    }

    let numberEnd = nonSpaceIdx;

    for (
      let char = this.input[numberEnd];
      numberEnd < this.input.length && char >= '0' && char <= '9';
      char = this.input[++numberEnd]);


    if (numberEnd === nonSpaceIdx) {
      throw new Error('Failed to read number from IO port');
    }

    return Number.parseInt(this.input.splice(0, numberEnd).join(''));
  }

  get HasInput(): boolean {
    return this.input.length > 0;
  }

  OutputWrite(data: string): void {
    this.output.push(...data);
  }

  OutputRead(): string {
    if (this.output.length === 0) {
      throw new Error('Failed to read from IO port');
    }

    return this.output.shift()!;
  }

  get HasOutput(): boolean {
    return this.output.length > 0;
  }
}
