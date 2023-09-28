import { NotNull } from '../NotNull';

export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number];

export class ShaderProgram {
  private uniformCache: Map<string, WebGLUniformLocation> = new Map();
  protected instance: WebGLProgram;
  public constructor(protected gl: WebGL2RenderingContext) {
    if (!gl) throw new Error('Invalid webgl2 context');

    this.instance =
      gl.createProgram() ?? NotNull("Can't create shader program");
  }
  public Attach(type: number, source: string) {
    const shader = this.gl.createShader(type);
    if (shader === null) throw new Error('Failed to create shader');

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const err = new Error(
        this.gl.getShaderInfoLog(shader) ?? 'Failed to compile shader'
      );
      this.gl.deleteShader(shader);
      throw err;
    }

    this.gl.attachShader(this.instance, shader);
  }
  public async AttachFromUrl(type: number, url: string) {
    this.Attach(type, await (await fetch(url)).text());
  }
  public Link() {
    this.gl.linkProgram(this.instance);
    if (!this.gl.getProgramParameter(this.instance, this.gl.LINK_STATUS)) {
      const err = new Error(
        this.gl.getProgramParameter(this.instance, this.gl.LINK_STATUS) ??
        'Failed to link shader'
      );
      this.gl.deleteProgram(this.instance);
      throw err;
    }
  }
  public Use() {
    this.gl.useProgram(this.instance);
  }
  public SetUniform3fv(name: string, value: number[]) {
    this.gl.uniform3fv(this.GetUniformLocation(name), value);
  }
  public SetUniform2fv(name: string, value: number[]) {
    this.gl.uniform2fv(this.GetUniformLocation(name), value);
  }
  public SetUniform4fv(name: string, value: number[]) {
    this.gl.uniform4fv(this.GetUniformLocation(name), value);
  }
  public SetUniform1f(name: string, value: number) {
    this.gl.uniform1f(this.GetUniformLocation(name), value);
  }
  public SetUniform1i(name: string, value: number) {
    this.gl.uniform1i(this.GetUniformLocation(name), value);
  }
  public SetUniform2iv(name: string, value: number[]) {
    this.gl.uniform2iv(this.GetUniformLocation(name), value);
  }
  public SetUniformMatrix4fv(name: string, value: Mat4 | Float32Array) {
    this.gl.uniformMatrix4fv(this.GetUniformLocation(name), false, value);
  }
  public GetAttributeLocation(name: string) {
    this.Use();

    const loc = this.gl.getAttribLocation(this.instance, name);

    if (loc === -1) throw new Error(`Failed to locate attribute '${name}'`);

    return loc;
  }
  private GetUniformLocation(name: string) {
    this.Use();

    let loc = this.uniformCache.get(name) ?? null;

    if (loc === null) {
      loc = this.gl.getUniformLocation(this.instance, name);

      if (loc === null) throw new Error(`Failed to locate uniform '${name}'`);

      this.uniformCache.set(name, loc);
    }

    return loc;
  }
}
