<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';

interface Emits {
  (e: 'contextReady', context: WebGL2RenderingContext): void;
  (e: 'resize'): void
}

const props = defineProps({
  width: { type: Number },
  height: { type: Number }
});

const emit = defineEmits<Emits>();

const innerWidth = ref(0);
const innerHeight = ref(0);

const canvas = ref<HTMLCanvasElement>();
let context: WebGL2RenderingContext | null = null;

const isPropsUsed = computed(
  () => !(props.width === undefined && props.height === undefined)
);

const width = computed(() => props.width ?? innerWidth.value);
const height = computed(() => props.height ?? innerHeight.value);
const widthCss = computed(() => isPropsUsed.value ? SizingToCss(width.value) : '100%');
const heightCss = computed(() => isPropsUsed.value ? SizingToCss(height.value) : '100%');

onMounted(() => {
  SetupContext();

  if (isPropsUsed.value) {
    UpdateViewport();
  } else {
    OnResize();
    window.addEventListener('resize', OnResize);
  }
});

onBeforeUnmount(() => {
  if (!isPropsUsed.value) {
    window.removeEventListener('resize', OnResize);
  }
});

function UpdateViewport(): void {
  if (canvas.value) {
    canvas.value.width = width.value;
    canvas.value.height = height.value;

    context?.viewport(0, 0, width.value, height.value);
  }
}

function OnResize(): void {
  innerWidth.value = canvas.value?.clientWidth ?? 0;
  innerHeight.value = canvas.value?.clientHeight ?? 0;

  UpdateViewport();

  emit('resize');
}

function SetupContext(): void {
  if (canvas.value === undefined) {
    console.error('Canvas element not found');
    return;
  }

  context = canvas.value.getContext('webgl2', { stencil: true });

  if (context === null) {
    console.error("Can't initialize webgl2 context");
    return;
  }

  context.enable(context.CULL_FACE);

  context.enable(context.DEPTH_TEST);

  context.enable(context.BLEND);
  context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);

  emit('contextReady', context);
}

function SizingToCss(value: number): string {
  return `${value}px`;
}
</script>

<template>
  <canvas ref="canvas" :style="{ width: widthCss, height: heightCss }"></canvas>
</template>

<style scoped>
canvas {
  display: block;
  outline: none;
}
</style>
