# Endpoint coverage

وضعیت اولیه پیش از اتصال LAN است. `Mock implemented` یعنی route وجود دارد، نه این‌که parity واقعی اثبات شده باشد.

| Endpoint group | Count | Documented | Live tested | Real sample | Mock implemented | Confidence |
|---|---:|---|---|---|---|---|
| Read (`*/Get`, statements, invoicepayment) | 19 | yes | BLOCKED | no | yes | documented-only |
| Write (`*/Put`) | 10 | yes | intentionally skipped | no | yes | documented-only |

جزئیات هر endpoint پس از اجرای `pnpm shaygan:lan` در `captures/runs/<timestamp>/verification.json` تولید می‌شود.

| Endpoint | Live tested | Contract captured | Mock implemented | Parity confidence |
|---|---|---|---|---|
| `Account/GetStatement` | BLOCKED | no | yes | documented-only |
| `Account/Get` | BLOCKED | no | yes | documented-only |
| `Account/GetAccountDetail` | BLOCKED | no | yes | documented-only |
| `Cheque/GetPayableList` | BLOCKED | no | yes | documented-only |
| `Cheque/GetReceivableList` | BLOCKED | no | yes | documented-only |
| `Item/GetKardex` | BLOCKED | no | yes | documented-only |
| `Item/Get` | BLOCKED | no | yes | documented-only |
| `ItemGroup/GetList` | BLOCKED | no | yes | documented-only |
| `Job/Get` | BLOCKED | no | yes | documented-only |
| `Job/GetJobStatement` | BLOCKED | no | yes | documented-only |
| `Job/GetJobRemainByAccount` | BLOCKED | no | yes | documented-only |
| `Kol/GetList` | BLOCKED | no | yes | documented-only |
| `Moin/GetList` | BLOCKED | no | yes | documented-only |
| `Sargorooh/GetList` | BLOCKED | no | yes | documented-only |
| `StatementDetail/GetClosingBalance` | BLOCKED | no | yes | documented-only |
| `Stock/Get` | BLOCKED | no | yes | documented-only |
| `Item/GetRemain` | BLOCKED | no | yes | documented-only |
| `Invoice/Get` | BLOCKED | no | yes | documented-only |
| `invoicepayment/` | BLOCKED | no | yes | documented-only |
| `Document/Put` | intentionally skipped | no | yes | documented-only |
| `Account/Put` | intentionally skipped | no | yes | documented-only |
| `Invoice/Put` | intentionally skipped | no | yes | documented-only |
| `Item/Put` | intentionally skipped | no | yes | documented-only |
| `Job/Put` | intentionally skipped | no | yes | documented-only |
| `Voucher/Put` | intentionally skipped | no | yes | documented-only |
| `Sargorooh/Put` | intentionally skipped | no | yes | documented-only |
| `Kol/Put` | intentionally skipped | no | yes | documented-only |
| `Moin/Put` | intentionally skipped | no | yes | documented-only |
| `Cheque/PutRecievable` | intentionally skipped | no | yes | documented-only |
