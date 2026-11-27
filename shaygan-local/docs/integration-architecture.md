# معماری پیشنهادی integration آینده

این طراحی فقط interface است و فیچر حسابداری در محصول اصلی پیاده نشده است.

```ts
interface AccountingProvider {
  getAccounts(query: AccountQuery): Promise<AccountPage>;
  getItems(query: ItemQuery): Promise<ItemPage>;
  postCommand(command: AccountingCommand, approval: HumanApproval): Promise<PostingReceipt>;
}

interface ShayganProvider extends AccountingProvider {}
interface MockAccountingProvider extends AccountingProvider { reset(): Promise<void>; }
```

provider با config انتخاب شود و domainهای repairs/production مستقیماً payload شایگان نسازند؛ هر عملیات به command مستقل، idempotency key و mapping پایدار `internalID <-> Shaygan GUID` تبدیل شود.

مسیر production باید Outbox، retry پایدار، DLQ، audit trail، reconciliation دوره‌ای، compensation صریح و human approval پیش از posting مالی داشته باشد. هیچ event عملیاتی به‌تنهایی مجوز ثبت مالی نیست.
