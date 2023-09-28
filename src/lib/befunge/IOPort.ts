export class IOPort {
  private input: string[] = [];

  private output: string[] = [];

  InputWrite(data: string): void {
    this.input.push(...data);
  }

  InputRead(): string {
    if (this.input.length === 0) {
      throw new Error('Failed to read from IO port');
    }

    return this.input.shift()!;
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
