export type EndpointKind = 'read' | 'write';

export interface EndpointDefinition {
  path: string;
  kind: EndpointKind;
  page: number;
  domain?: string;
  model: string;
  maxRows?: number;
  note?: string;
}

export const endpoints: EndpointDefinition[] = [
  { path: 'Account/GetStatement', kind: 'read', page: 57, domain: 'DomainStatement', model: 'AccountStatementHeader' },
  { path: 'Account/Get', kind: 'read', page: 57, domain: 'DomainAccount', model: 'Account', maxRows: 100 },
  { path: 'Account/GetAccountDetail', kind: 'read', page: 57, domain: 'DomainAccountByDetail', model: 'AccountByDetail' },
  { path: 'Cheque/GetPayableList', kind: 'read', page: 57, domain: 'DomainPayableChequeBook', model: 'PayableChequeRead' },
  { path: 'Cheque/GetReceivableList', kind: 'read', page: 57, domain: 'DomainReceivableCheckBook', model: 'ReceivableChequeRead' },
  { path: 'Item/GetKardex', kind: 'read', page: 57, domain: 'DomainItemKardex', model: 'ItemKardexHeader' },
  { path: 'Item/Get', kind: 'read', page: 58, domain: 'DomainItem', model: 'Item' },
  { path: 'ItemGroup/GetList', kind: 'read', page: 58, domain: 'DomainItemGroup', model: 'ItemGroupGetModel' },
  { path: 'Job/Get', kind: 'read', page: 58, domain: 'DomainJob', model: 'JobRead' },
  { path: 'Job/GetJobStatement', kind: 'read', page: 58, domain: 'DomainJobStatement', model: 'JobStatementHeader' },
  { path: 'Job/GetJobRemainByAccount', kind: 'read', page: 58, domain: 'DomainJobStatement', model: 'JobRemainByAccount' },
  { path: 'Kol/GetList', kind: 'read', page: 58, domain: 'DomainKol', model: 'KolRead' },
  { path: 'Moin/GetList', kind: 'read', page: 58, domain: 'DomainMoin', model: 'MoinRead' },
  { path: 'Sargorooh/GetList', kind: 'read', page: 58, domain: 'DomainSargorooh', model: 'SargoroohRead' },
  { path: 'StatementDetail/GetClosingBalance', kind: 'read', page: 58, domain: 'DomainStatementDetail', model: 'MStatementClosingBalance' },
  { path: 'Stock/Get', kind: 'read', page: 58, domain: 'DomainStock', model: 'Stock' },
  { path: 'Item/GetRemain', kind: 'read', page: 58, domain: 'DomainItemRemain', model: 'ItemRemainModel' },
  { path: 'Invoice/Get', kind: 'read', page: 58, domain: 'DomainInvoice', model: 'Invoice', maxRows: 20 },
  { path: 'invoicepayment/', kind: 'read', page: 58, domain: 'Domaininvoicepayment', model: 'InvoicePayment', note: 'PDF includes api/invoicepayment/ with trailing slash.' },
  { path: 'Document/Put', kind: 'write', page: 59, model: 'Document' },
  { path: 'Account/Put', kind: 'write', page: 59, model: 'Account' },
  { path: 'Invoice/Put', kind: 'write', page: 59, model: 'Invoice' },
  { path: 'Item/Put', kind: 'write', page: 59, model: 'Item' },
  { path: 'Job/Put', kind: 'write', page: 59, model: 'Job' },
  { path: 'Voucher/Put', kind: 'write', page: 59, model: 'Voucher' },
  { path: 'Sargorooh/Put', kind: 'write', page: 59, model: 'Sargorooh' },
  { path: 'Kol/Put', kind: 'write', page: 59, model: 'Kol' },
  { path: 'Moin/Put', kind: 'write', page: 59, model: 'Moin' },
  { path: 'Cheque/PutRecievable', kind: 'write', page: 59, model: 'Cheque', note: 'Spelling is copied exactly from the PDF and is not live-verified.' }
];

export const readEndpoints = endpoints.filter((endpoint) => endpoint.kind === 'read');
export const writeEndpoints = endpoints.filter((endpoint) => endpoint.kind === 'write');
