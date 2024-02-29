<script setup lang="ts">
import { onBeforeUnmount } from 'vue';

import { AppService } from './AppService';
import { GlobalDependencies } from './GlobalDependencies';
import { InjectionToken } from './InjectionToken';

import { Inversify } from '@/Inversify';
import { BefungeSourceCodeCodec } from '@/lib/befunge/BefungeSourceCodeCodec';
import Webgl2Canvas from '@/lib/VueComponents/WebglCanvas.vue';

let service!: AppService;

const props = defineProps({ encoded: { required: false, type: String, default: '' } });

onBeforeUnmount(() => service.Dispose());

async function OnContextReady(context: WebGL2RenderingContext): Promise<void> {
  Inversify
    .bind<WebGL2RenderingContext>(InjectionToken.WebGLRenderingContext)
    .toConstantValue(context);

  await Inversify.getAsync(GlobalDependencies);

  service = await Inversify.getAsync(AppService);
  service.Resize();

  OnSharedCode();
}

function OnResize(): void {
  service?.Resize();
}

function OnMouseMove(e: MouseEvent): void {
  service?.OnMouseMove(e);
}

function OnMouseDown(e: MouseEvent): void {
  service?.OnMouseDown(e);
}

function OnMouseUp(e: MouseEvent): void {
  service?.OnMouseUp(e);
}

function OnWheel(e: WheelEvent): void {
  service?.OnWheel(e);
}

function OnKeyDown(e: KeyboardEvent): void {
  service?.OnKeyDown(e);
}

function OnTouchMove(e: TouchEvent): void {
  service?.OnTouchMove(e);
}

function OnTouchStart(e: TouchEvent): void {
  service?.OnTouchStart(e);
}

function OnTouchEnd(e: TouchEvent): void {
  service?.OnTouchEnd(e);
}

function OnSharedCode() {
  if (props.encoded.length > 0) {
    try {
      const sourceCode = BefungeSourceCodeCodec.Decode(props.encoded);
      service.LoadSourceCodeToEditor(sourceCode);
    } catch (e) {
      if (e instanceof Error) {
        service.Snackbar.ShowError(e.message);
      }
    }
  }
};

</script>

<template>
  <webgl2-canvas autofocus tabindex="0" @contextReady="OnContextReady" @resize="OnResize" @mousemove="OnMouseMove"
    @mousedown="OnMouseDown" @mouseup="OnMouseUp" @wheel.passive="OnWheel" @keydown="OnKeyDown" @touchmove="OnTouchMove"
    @touchstart="OnTouchStart" @touchend="OnTouchEnd" />
</template>
