import { Injectable } from '@nestjs/common';
import bwipjs from 'bwip-js';

export interface LabelItem {
  title: string;
  code: string;
  qrText?: string;
  subtitle?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

@Injectable()
export class LabelService {
  barcodeSvg(text: string): string {
    return bwipjs.toSVG({ bcid: 'code128', text, scale: 2, height: 12, includetext: true, textxalign: 'center' } as any);
  }

  qrSvg(text: string): string {
    return bwipjs.toSVG({ bcid: 'qrcode', text, scale: 4 } as any);
  }

  async png(kind: 'qr' | 'barcode', text: string): Promise<Buffer> {
    return bwipjs.toBuffer(
      (kind === 'qr'
        ? { bcid: 'qrcode', text, scale: 6 }
        : { bcid: 'code128', text, scale: 3, height: 14, includetext: true, textxalign: 'center' }) as any,
    );
  }

  /** Printable RTL label sheet — each label carries a QR code and a Code128 barcode. */
  renderSheet(items: LabelItem[]): string {
    const cards = items
      .map(
        (i) => `
      <div class="label">
        <div class="title">${esc(i.title)}</div>
        ${i.subtitle ? `<div class="sub">${esc(i.subtitle)}</div>` : ''}
        <div class="codes">
          <div class="qr">${this.qrSvg(i.qrText ?? i.code)}</div>
          <div class="bar">${this.barcodeSvg(i.code)}</div>
        </div>
      </div>`,
      )
      .join('');
    return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>لیبل کالا</title>
<style>
  body{font-family:Tahoma,Vazirmatn,Arial,sans-serif;margin:12px}
  .label{display:inline-block;width:9cm;border:1px solid #333;border-radius:6px;padding:8px;margin:6px;vertical-align:top;page-break-inside:avoid}
  .title{font-weight:bold;font-size:13px;margin-bottom:4px}
  .sub{font-size:11px;color:#444;margin-bottom:4px}
  .codes{display:flex;gap:10px;align-items:center;justify-content:space-between}
  .qr svg{width:2.6cm;height:2.6cm}.bar svg{width:5cm;height:auto}
  @media print{body{margin:0}}
</style></head><body>${cards}</body></html>`;
  }
}
