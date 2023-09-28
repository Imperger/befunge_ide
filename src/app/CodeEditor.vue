<script setup lang="ts">
import { onBeforeUnmount } from 'vue';

import { CodeEditorService } from './CodeEditorService';

import Webgl2Canvas from '@/lib/VueComponents/WebglCanvas.vue';

let service!: CodeEditorService;


onBeforeUnmount(() => service.Dispose());

async function OnContextReady(context: WebGL2RenderingContext): Promise<void> {
  service = await CodeEditorService.Create(context);
  service.Resize();
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

</script>

<template>
  <webgl2-canvas tabindex="0" @contextReady="OnContextReady" @resize="OnResize" @mousemove="OnMouseMove"
    @mousedown="OnMouseDown" @mouseup="OnMouseUp" @wheel="OnWheel" @keydown="OnKeyDown" />
</template>
