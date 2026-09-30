<script setup lang="ts">
import { encodeCode128 } from './barcode-generator.service';
import { useValidation } from '@/composable/validation';
import { isNotThrowing } from '@/utils/boolean';

const input = ref('IT-TOOLS');
const moduleWidth = ref(2);
const height = ref(80);
const showText = ref(true);

const encoded = computed(() => {
  try {
    return encodeCode128(input.value);
  }
  catch {
    return undefined;
  }
});

const validation = useValidation({
  source: input,
  rules: [
    {
      validator: value => !value || isNotThrowing(() => encodeCode128(value)),
      message: 'Code 128 supports printable ASCII characters only',
    },
  ],
});

// x offset of each bar, alternating bar/space, with quiet zones of 10 modules
const bars = computed(() => {
  if (!encoded.value) {
    return [];
  }
  const quietZone = 10;
  const positions: { x: number; width: number }[] = [];
  let x = quietZone;
  let isBar = true;
  for (const width of encoded.value.barWidths) {
    if (isBar) {
      positions.push({ x, width });
    }
    x += width;
    isBar = !isBar;
  }
  const totalModules = x + quietZone;
  return positions.map(({ x: barX, width }) => ({
    x: barX * moduleWidth.value,
    width: width * moduleWidth.value,
    total: totalModules * moduleWidth.value,
  }));
});

const svgWidth = computed(() => bars.value[0]?.total ?? 0);
const textWidth = showText.value ? 24 : 0;
const svgHeight = computed(() => height.value + textWidth + 8);

const svgMarkup = computed(() => {
  if (!encoded.value || svgWidth.value === 0) {
    return '';
  }
  const rects = bars.value
    .map(({ x, width }) => `<rect x="${x}" y="0" width="${width}" height="${height.value}" fill="#000"/>`)
    .join('');
  const text = showText.value
    ? `<text x="${svgWidth.value / 2}" y="${height.value + 20}" text-anchor="middle" font-family="monospace" font-size="14" fill="#000">${input.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.value}" height="${svgHeight.value}" viewBox="0 0 ${svgWidth.value} ${svgHeight.value}">${rects}${text}</svg>`;
});

const svgDataUrl = computed(() =>
  svgMarkup.value ? `data:image/svg+xml;base64,${btoa(svgMarkup.value)}` : '',
);

function downloadSvg() {
  if (!svgMarkup.value) {
    return;
  }
  const blob = new Blob([svgMarkup.value], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `barcode-${input.value.replace(/[^\w.-]+/g, '_') || 'code128'}.svg`;
  link.click();
  URL.revokeObjectURL(link.href);
}
</script>

<template>
  <c-card>
    <c-input-text
      v-model:value="input"
      label="Text to encode (Code 128, printable ASCII)"
      placeholder="Put your text here..."
      clearable
      :validation="validation"
      mb-3
    />

    <n-grid cols="3" x-gap="12" mb-4>
      <n-gi>
        <n-form-item label="Module width (px)" label-placement="top" :show-feedback="false">
          <n-input-number v-model:value="moduleWidth" :min="1" :max="8" w-full />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="Height (px)" label-placement="top" :show-feedback="false">
          <n-input-number v-model:value="height" :min="30" :max="300" w-full />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="Human-readable text" label-placement="top" :show-feedback="false">
          <n-switch v-model:value="showText" />
        </n-form-item>
      </n-gi>
    </n-grid>

    <c-alert v-if="input && !encoded" type="error">
      Code 128 (subsets B/C) supports printable ASCII characters only.
    </c-alert>

    <div v-else-if="encoded" flex flex-col items-center gap-3>
      <img
        data-test-id="barcode-svg"
        :src="svgDataUrl"
        :alt="`Code 128 barcode of ${input}`"
        style="max-width: 100%; image-rendering: pixelated;"
      >
      <div text-xs op-60>
        {{ encoded.codes.length }} symbols · checksum {{ encoded.checksum }} · {{ bars.length }} bars
      </div>
      <c-button @click="downloadSvg()">
        Download SVG
      </c-button>
    </div>
  </c-card>
</template>
