import { Injectable, NotFoundException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { SequenceService } from '../../common/shared/sequence.service';
import { ci, dateRange, orderByOf, pageArgs, paged, searchTerms, termConditions } from '../../common/dto/page-query.dto';
import { Prisma } from '../../generated/prisma/client';
import { QueryInvoicesDto } from '../dto/warehouse.dto';
import { formatPersianDateTime, formatPersianDate } from '../../common/shared/persian-date';
import { WarehouseInvoiceType } from '../../generated/prisma/enums';

const PREFIX: Record<string, string> = { RECEIPT: 'RCV', TRANSFER: 'TRF', ISSUE: 'ISS', ADJUSTMENT: 'ADJ' };
const TITLE: Record<string, string> = {
  RECEIPT: 'فاکتور ورود کالا', TRANSFER: 'فاکتور انتقال بین انبار', ISSUE: 'فاکتور خروج کالا', ADJUSTMENT: 'سند اصلاح موجودی (انبارگردانی)',
};
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface InvoiceLineInput {
  productId: string;
  lotNumber?: string | null;
  serialNumber?: string | null;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
  quantity: number; // negative allowed for ADJUSTMENT
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService, private readonly sequence: SequenceService) {}

  async create(
    tx: any,
    input: {
      type: WarehouseInvoiceType; warehouseId: string; counterWarehouseId?: string | null;
      refType?: string; refId?: string; notes?: string | null; issuedById?: string | null; lines: InvoiceLineInput[];
    },
  ) {
    const products = await tx.product.findMany({ where: { id: { in: [...new Set(input.lines.map((l) => l.productId))] } }, select: { id: true, code: true, fullName: true } });
    const byId = new Map<string, any>(products.map((p: any) => [p.id, p]));
    const lines = input.lines.map((l) => ({
      productId: l.productId, code: byId.get(l.productId)?.code, name: byId.get(l.productId)?.fullName,
      lotNumber: l.lotNumber ?? null, serialNumber: l.serialNumber ?? null,
      manufactureDate: l.manufactureDate ?? null, expiryDate: l.expiryDate ?? null, quantity: l.quantity,
    }));
    const number = await this.sequence.next(PREFIX[input.type], tx);
    return tx.warehouseInvoice.create({
      data: {
        number, type: input.type, warehouseId: input.warehouseId, counterWarehouseId: input.counterWarehouseId ?? null,
        refType: input.refType, refId: input.refId, notes: input.notes, issuedById: input.issuedById ?? null, lines,
      },
    });
  }

  /** Ids of invoices whose line snapshot (code, name, lot, serial, productId…) contains the text. */
  private async lineMatchIds(text: string): Promise<string[]> {
    const pattern = `%${text.replace(/[\\%_]/g, '\\$&')}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "WarehouseInvoice" WHERE lines::text ILIKE ${pattern}`);
    return rows.map((r) => r.id);
  }

  async list(q: QueryInvoicesDto) {
    const { skip, take } = pageArgs(q);
    const conditions: any[] = [];
    if (q.type) conditions.push({ type: q.type });
    if (q.warehouseId) conditions.push({ OR: [{ warehouseId: q.warehouseId }, { counterWarehouseId: q.warehouseId }] });
    if (q.issuedById) conditions.push({ issuedById: q.issuedById });
    if (q.productId) conditions.push({ id: { in: await this.lineMatchIds(q.productId) } });
    const range = dateRange('issuedAt', q.from, q.to);
    if (range) conditions.push(range);
    for (const term of searchTerms(q)) {
      const lineIds = await this.lineMatchIds(term);
      conditions.push({
        OR: [
          { number: ci(term) }, { notes: ci(term) },
          { warehouse: { is: { OR: [{ name: ci(term) }, { number: ci(term) }] } } },
          { counterWarehouse: { is: { OR: [{ name: ci(term) }, { number: ci(term) }] } } },
          { id: { in: lineIds } },
        ],
      });
    }
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(q, { issuedAt: (d) => ({ issuedAt: d }), number: (d) => ({ number: d }), type: (d) => ({ type: d }) }, [{ issuedAt: 'desc' }, { id: 'desc' }]);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.warehouseInvoice.findMany({
        where, skip, take, orderBy,
        include: { warehouse: { select: { id: true, name: true, number: true } }, counterWarehouse: { select: { id: true, name: true, number: true } } },
      }),
      this.prisma.warehouseInvoice.count({ where }),
    ]);
    return paged(items, total, q);
  }


  async get(id: string) {
    const inv = await this.prisma.warehouseInvoice.findUnique({
      where: { id },
      include: { warehouse: true, counterWarehouse: true },
    });
    if (!inv) throw new NotFoundException('فاکتور یافت نشد');
    return inv;
  }

  private async signatureDataUrl(userId?: string | null) {
    if (!userId) return null;
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, signatureStorageKey: true, signatureMimeType: true } });
    if (!u) return null;
    let dataUrl: string | null = null;
    if (u.signatureStorageKey && u.signatureMimeType) {
      try {
        const buf = await readFile(join(process.cwd(), 'uploads', 'signatures', 'users', u.signatureStorageKey));
        dataUrl = `data:${u.signatureMimeType};base64,${buf.toString('base64')}`;
      } catch {
        dataUrl = null;
      }
    }
    return { name: u.name, dataUrl };
  }

  /** Printable RTL invoice (browser → Print → Save as PDF). Includes issuer signature when the user has one. */
  async renderHtml(id: string) {
    const inv = await this.get(id);
    const issuer = await this.signatureDataUrl(inv.issuedById);
    const lines = (inv.lines as any[]) ?? [];
    const rows = lines
      .map(
        (l, i) => `<tr><td>${i + 1}</td><td>${esc(l.code)}</td><td>${esc(l.name)}</td><td>${esc(l.lotNumber)}</td><td>${esc(l.serialNumber)}</td>
        <td>${formatPersianDate(l.manufactureDate)}</td><td>${formatPersianDate(l.expiryDate)}</td><td>${esc(l.quantity)}</td></tr>`,
      )
      .join('');
    return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${esc(inv.number)}</title>
<style>
 body{font-family:Tahoma,Vazirmatn,Arial,sans-serif;margin:24px;color:#111}
 h1{font-size:20px;margin:0 0 12px} .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:14px;font-size:13px}
 table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #444;padding:5px 6px;text-align:center} th{background:#eee}
 .sign{margin-top:36px;display:flex;justify-content:flex-start;gap:60px;font-size:13px} .sign img{height:70px;display:block}
 @media print{body{margin:8px}}
</style></head><body>
<h1>${TITLE[inv.type]}</h1>
<div class="meta">
 <div><b>شماره فاکتور:</b> ${esc(inv.number)}</div><div><b>تاریخ صدور:</b> ${formatPersianDateTime(inv.issuedAt)}</div>
 <div><b>انبار:</b> ${esc(inv.warehouse.name)} (${esc(inv.warehouse.number)})</div>
 ${inv.counterWarehouse ? `<div><b>انبار مقابل:</b> ${esc(inv.counterWarehouse.name)} (${esc(inv.counterWarehouse.number)})</div>` : '<div></div>'}
 ${inv.notes ? `<div style="grid-column:1/-1"><b>توضیحات:</b> ${esc(inv.notes)}</div>` : ''}
</div>
<table><thead><tr><th>#</th><th>کد کالا</th><th>نام کالا</th><th>Lot</th><th>سریال</th><th>تاریخ تولید</th><th>تاریخ انقضا</th><th>تعداد</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sign"><div><b>صادرکننده:</b> ${esc(issuer?.name ?? '')}${issuer?.dataUrl ? `<img src="${issuer.dataUrl}" alt="امضا">` : ''}</div></div>
</body></html>`;
  }
}
