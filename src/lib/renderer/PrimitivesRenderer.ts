
import { injectable, unmanaged } from 'inversify';

import { ArrayHelper } from '../ArrayHelper';
import { NotNull } from '../NotNull';
import { ArrayItemType } from '../TypeUtil';

import { ShaderProgram } from './ShaderProgram';
import { TypeSizeResolver } from './TypeSizeResolver';

interface ShaderProgramSource {
  vertex: string;
  fragment: string;
}

type BasePrimitiveType =
  | typeof WebGL2RenderingContext.POINTS
  | typeof WebGL2RenderingContext.LINES
  | typeof WebGL2RenderingContext.LINE_LOOP
  | typeof WebGL2RenderingContext.LINE_STRIP
  | typeof WebGL2RenderingContext.TRIANGLES
  | typeof WebGL2RenderingContext.TRIANGLE_STRIP
  | typeof WebGL2RenderingContext.TRIANGLE_FAN;

type FloatTypes = typeof WebGL2RenderingContext.HALF_FLOAT | typeof WebGL2RenderingContext.FLOAT;
type IntegerTypes = ArrayItemType<PrimitivesRenderer['IntegerTypes']>

interface FloatAttributeDescription {
  name: string;
  size: GLint;
  type: FloatTypes;
  normalized: GLboolean;
}

interface IntegerAttributeDescription {
  name: string;
  size: GLint;
  type: IntegerTypes;
}

type AttributeDescription = FloatAttributeDescription | IntegerAttributeDescription;

interface PrimitiveDescription {
  indicesPerPrimitive: number;
  basePrimitiveType: BasePrimitiveType;
}

@injectable()
export class PrimitivesRenderer {
  protected vbo!: WebGLBuffer;
  private vao!: WebGLVertexArrayObject;
  protected shader!: ShaderProgram;

  protected vertexData = new ArrayBuffer(0);

  //private componentsPerAttributeSet = 0;
  /**
   * Size of one vertex attributes in bytes
   */
  private stride = 0;
  /**
   * Count of primitive values per vertex
   */
  private componentsPerVertex = 0;
  /**
   * The total count of vertex stored in vertexData
   */
  private vertexCount = 0;

  constructor(
    @unmanaged() protected readonly gl: WebGL2RenderingContext,
    @unmanaged() shaderSource: ShaderProgramSource,
    @unmanaged() private attributes: AttributeDescription[],
    @unmanaged() private readonly primitiveDescription: PrimitiveDescription
  ) {
    this.Setup(shaderSource);
    this.SetupAttributes(attributes);
  }

  public UploadAttributes(attributes: number[]): void {
    this.vertexCount = attributes.length / this.componentsPerVertex;
    this.vertexData = new ArrayBuffer(this.stride * this.vertexCount);

    for (let vertexStart = 0; vertexStart < attributes.length; vertexStart += this.componentsPerVertex) {
      for (let attrDescIdx = 0, offset = 0, byteOffset = 0;
        attrDescIdx < this.attributes.length;
        offset += this.attributes[attrDescIdx].size,
        byteOffset += TypeSizeResolver.Resolve(this.attributes[attrDescIdx].type) * this.attributes[attrDescIdx].size,
        ++attrDescIdx) {

        const attrInfo = this.attributes[attrDescIdx];

        switch (attrInfo.type) {
          case this.gl.FLOAT:
            {
              const target = new Float32Array(this.vertexData, vertexStart / this.componentsPerVertex * this.stride + byteOffset, attrInfo.size);

              target.set(attributes.slice(vertexStart + offset, vertexStart + offset + attrInfo.size));
            }
            break;
          case this.gl.UNSIGNED_INT:
            {
              const target = new Uint32Array(this.vertexData, vertexStart / this.componentsPerVertex * this.stride + byteOffset, attrInfo.size);

              target.set(attributes.slice(vertexStart + offset, vertexStart + offset + attrInfo.size));
            }
            break;
          default:
            throw new Error('Unsupported attribute type');
        }
      }
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.vertexData,
      this.gl.DYNAMIC_DRAW
    );
  }

  /**
   * Update attributes for specific primitive. 
   * @param attributes Attributes that will be uploaded
   * @param offset Starting index of primitive attributes. Measured in number of attributes
   */
  public UpdatePrimitiveComponents(attributes: number[], offset: number): void {
    const vertexDataOffsetStart = offset / this.componentsPerVertex * this.stride;
    for (let vertexStart = 0; vertexStart < attributes.length; vertexStart += this.componentsPerVertex) {
      for (
        let attrDescIdx = 0, byteOffset = vertexDataOffsetStart, attributeOffset = 0;
        attrDescIdx < this.attributes.length;
        attributeOffset += this.attributes[attrDescIdx].size,
        byteOffset += TypeSizeResolver.Resolve(this.attributes[attrDescIdx].type) * this.attributes[attrDescIdx].size,
        ++attrDescIdx) {

        const attrInfo = this.attributes[attrDescIdx];

        switch (attrInfo.type) {
          case this.gl.FLOAT:
            {
              const target = new Float32Array(this.vertexData, vertexStart / this.componentsPerVertex * this.stride + byteOffset, attrInfo.size);

              target.set(attributes.slice(vertexStart + attributeOffset, vertexStart + attributeOffset + attrInfo.size));
            }
            break;
          case this.gl.UNSIGNED_INT:
            {
              const target = new Uint32Array(this.vertexData, vertexStart / this.componentsPerVertex * this.stride + byteOffset, attrInfo.size);

              target.set(attributes.slice(vertexStart + attributeOffset, vertexStart + attributeOffset + attrInfo.size));
            }
            break;
          default:
            throw new Error('Unsupported attribute type');
        }
      }
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);

    const modifiedData = new Uint8Array(this.vertexData, vertexDataOffsetStart, attributes.length / this.componentsPerVertex * this.stride);
    this.gl.bufferSubData(
      this.gl.ARRAY_BUFFER,
      vertexDataOffsetStart,
      modifiedData,
      0,
      modifiedData.length);
  }

  /**
   * Extract primitive attributes
   * @param index primitive index
   * @returns primitive components
   */
  PrimitiveComponents(index: number): number[] {
    return this.PrimitiveComponentsRange(index, 1);
  }

  /**
   * Extract attributes for 1 or more consequenced primitives
   * @param primitiveStartIdx index of a first primitive
   * @param primitivesCount number of primitives whose attributes will be retrieved
   * @returns primitives components
   */
  PrimitiveComponentsRange(primitiveStartIdx: number, primitivesCount: number): number[] {
    const attributes = new Array<number>(this.ComponentsPerPrimitive * primitivesCount).fill(0);

    for (let vertexIdx = 0, attrIdx = 0; vertexIdx < this.primitiveDescription.indicesPerPrimitive * primitivesCount; ++vertexIdx) {
      let byteOffset = (primitiveStartIdx * this.primitiveDescription.indicesPerPrimitive + vertexIdx) * this.stride;

      for (const attrInfo of this.attributes) {
        switch (attrInfo.type) {
          case this.gl.FLOAT:
            {
              const src = new Float32Array(this.vertexData, byteOffset, attrInfo.size);
              ArrayHelper.Copy(attributes, attrIdx, src, 0, src.length);
            }
            break;
          case this.gl.UNSIGNED_INT:
            {
              const src = new Uint32Array(this.vertexData, byteOffset, attrInfo.size);
              ArrayHelper.Copy(attributes, attrIdx, src, 0, src.length);
            }
            break;
          default:
            throw new Error('Unsupported attribute type');
        }

        byteOffset += TypeSizeResolver.Resolve(attrInfo.type) * attrInfo.size;
        attrIdx += attrInfo.size;
      }
    }

    return attributes;
  }

  /**
   * Returns the total count of primitives
   */
  get TotalPrimitives(): number {
    return this.vertexCount / this.primitiveDescription.indicesPerPrimitive;
  }

  /**
     * Returns the count of components per vertex
     */
  get ComponentsPerVertex(): number {
    return this.componentsPerVertex;
  }

  /**
   * Returns the count of components per primitive
   */
  get ComponentsPerPrimitive(): number {
    return this.componentsPerVertex * this.primitiveDescription.indicesPerPrimitive;
  }

  public Draw(): void {
    this.shader.Use();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.bindVertexArray(this.vao);
    this.gl.drawArrays(
      this.primitiveDescription.basePrimitiveType,
      0,
      this.vertexCount
    );
  }

  Dispose(): void {
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteVertexArray(this.vao);

    this.shader.Dispose();
  }

  private Setup(shaderSource: ShaderProgramSource): void {
    this.vbo = this.gl.createBuffer() ?? NotNull('Failed to create vbo');
    this.vao = this.gl.createVertexArray() ?? NotNull('Failed to create vao');

    this.shader = new ShaderProgram(this.gl);
    this.shader.Attach(this.gl.FRAGMENT_SHADER, shaderSource.fragment);
    this.shader.Attach(this.gl.VERTEX_SHADER, shaderSource.vertex);
    this.shader.Link();
    this.shader.Use();
  }

  private SetupAttributes(attributes: AttributeDescription[]): void {
    if (attributes.length === 0) {
      throw new Error("Attributes description can't be empty");
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);

    this.gl.bindVertexArray(this.vao);

    [this.componentsPerVertex, this.stride] = attributes.reduce(
      (acc, attr) => [acc[0] + attr.size, acc[1] + attr.size * TypeSizeResolver.Resolve(attr.type)],
      [0, 0]);

    for (
      let n = 0, offset = 0;
      n < attributes.length;
      offset += attributes[n].size * TypeSizeResolver.Resolve(attributes[n].type),
      ++n) {
      const attr = attributes[n];

      const location = this.shader.GetAttributeLocation(attr.name);
      this.gl.enableVertexAttribArray(location);

      if (this.IsIntegerAttributesType(attr)) {
        this.gl.vertexAttribIPointer(
          location,
          attr.size,
          attr.type,
          this.stride,
          offset);
      } else {
        this.gl.vertexAttribPointer(
          location,
          attr.size,
          attr.type,
          attr.normalized,
          this.stride,
          offset);
      }
    }

    this.gl.bindVertexArray(null);
  }

  private IsIntegerAttributesType(attributes: AttributeDescription): attributes is IntegerAttributeDescription {
    return (this.IntegerTypes as number[]).includes(attributes.type);
  }

  private get IntegerTypes() {
    return [this.gl.BYTE, this.gl.UNSIGNED_BYTE,
    this.gl.SHORT, this.gl.UNSIGNED_SHORT,
    this.gl.INT, this.gl.UNSIGNED_INT];
  }
}
