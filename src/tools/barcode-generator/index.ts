import { Barcode } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'Barcode generator',
  path: '/barcode-generator',
  description: 'Generate Code 128 barcodes (auto B/C subsets) as scalable SVG with configurable size',
  keywords: ['barcode', 'code128', 'code128b', 'code128c', 'generator', 'svg', 'scan'],
  component: () => import('./barcode-generator.vue'),
  icon: Barcode,
  createdAt: new Date('2026-10-01'),
});
