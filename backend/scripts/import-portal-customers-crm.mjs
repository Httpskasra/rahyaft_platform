import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = path.resolve(
  scriptDirectory,
  '../../needBackup/portal-customers-crm.normalized.json',
);
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const fileArgumentIndex = args.indexOf('--file');
const inputFile =
  fileArgumentIndex >= 0
    ? path.resolve(process.cwd(), args[fileArgumentIndex + 1] ?? '')
    : defaultFile;

if (args.includes('--help')) {
  console.log(
    'Usage: node scripts/import-portal-customers-crm.mjs [--file <path>] [--apply]',
  );
  console.log('Without --apply, validates the file and reports a dry run.');
  process.exit(0);
}

if (fileArgumentIndex >= 0 && !args[fileArgumentIndex + 1]) {
  throw new Error('--file requires a path');
}

function stableId(sourceKey) {
  const bytes = createHash('sha256')
    .update(`rahyaft-portal-customers-crm-v1\0${sourceKey}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parsePortalDate(value) {
  if (!value) return null;
  const match = String(value)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const [, monthText, dayText, yearText, hourText, minuteText, secondText, meridiem] =
    match;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 1 ||
    hour > 12 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const hour24 = (hour % 12) + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function validatePayload(payload) {
  if (
    payload?.format !== 'rahyaft.portal.customers-crm.normalized' ||
    payload.version !== 1
  ) {
    throw new Error('Unsupported or invalid portal import JSON format');
  }

  for (const key of ['customers', 'opportunities', 'activities', 'addresses']) {
    if (!Array.isArray(payload[key])) {
      throw new Error(`Missing expected array: ${key}`);
    }
  }

  const customerBySourceKey = new Map();
  for (const customer of payload.customers) {
    if (!customer.sourceKey || customerBySourceKey.has(customer.sourceKey)) {
      throw new Error(`Missing or duplicate customer source key: ${customer.sourceKey}`);
    }
    if (!['PERSON', 'ORGANIZATION'].includes(customer.target?.type)) {
      throw new Error(`Invalid customer type for ${customer.sourceKey}`);
    }
    if (!['ACTIVE', 'INACTIVE', 'BLACKLISTED'].includes(customer.target?.status)) {
      throw new Error(`Invalid customer status for ${customer.sourceKey}`);
    }
    customerBySourceKey.set(customer.sourceKey, customer);
  }

  const opportunityKeys = new Set();
  for (const opportunity of payload.opportunities) {
    if (!opportunity.sourceKey || opportunityKeys.has(opportunity.sourceKey)) {
      throw new Error(`Missing or duplicate opportunity source key: ${opportunity.sourceKey}`);
    }
    if (!customerBySourceKey.has(opportunity.customerSourceKey)) {
      throw new Error(`Unresolved customer for opportunity ${opportunity.sourceKey}`);
    }
    opportunityKeys.add(opportunity.sourceKey);
  }

  const activityKeys = new Set();
  for (const activity of payload.activities) {
    if (!activity.sourceKey || activityKeys.has(activity.sourceKey)) {
      throw new Error(`Missing or duplicate activity source key: ${activity.sourceKey}`);
    }
    if (!customerBySourceKey.has(activity.customerSourceKey)) {
      throw new Error(`Unresolved customer for activity ${activity.sourceKey}`);
    }
    activityKeys.add(activity.sourceKey);
  }

  for (const address of payload.addresses) {
    if (!customerBySourceKey.has(address.customerSourceKey)) {
      throw new Error(`Unresolved customer for address ${address.sourceKey}`);
    }
  }

  return customerBySourceKey;
}

async function insertRows(client, table, columns, rows, batchSize = 400) {
  let inserted = 0;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values = [];
    const placeholders = batch.map((row) => {
      const rowPlaceholders = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    });

    const result = await client.query(
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT ("id") DO NOTHING`,
      values,
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

const payload = JSON.parse(await readFile(inputFile, 'utf8'));
const customerBySourceKey = validatePayload(payload);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set; run the importer from backend/');
}

const connection = new URL(databaseUrl);
const databaseName = decodeURIComponent(connection.pathname.slice(1));
if (
  !['localhost', '127.0.0.1', '::1'].includes(connection.hostname) ||
  databaseName !== 'enterprise'
) {
  throw new Error(
    `Refusing non-dev database target ${connection.hostname}/${databaseName}; expected localhost/enterprise`,
  );
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  const target = await client.query(
    'SELECT current_database() AS database, current_user AS db_user',
  );
  if (
    target.rows[0].database !== 'enterprise' ||
    target.rows[0].db_user !== 'app'
  ) {
    throw new Error('Connected database identity differs from expected dev target');
  }

  const before = await client.query(`
    SELECT 'customers' AS entity, count(*)::int AS count FROM "Customer"
    UNION ALL SELECT 'addresses', count(*)::int FROM "CustomerAddress"
    UNION ALL SELECT 'opportunities', count(*)::int FROM "SalesOpportunity"
    UNION ALL SELECT 'activities', count(*)::int FROM "CustomerActivity"
  `);
  const plan = {
    database: target.rows[0].database,
    mode: apply ? 'insert-only' : 'dry-run',
    file: inputFile,
    rows: {
      customers: payload.customers.length,
      addresses: payload.addresses.length,
      opportunities: payload.opportunities.length,
      activities: payload.activities.length,
    },
    existing: Object.fromEntries(before.rows.map((row) => [row.entity, row.count])),
  };

  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    console.log('Dry run only. Re-run with --apply to import.');
    process.exitCode = 0;
  } else {
    await client.query('BEGIN');
    try {
      const importedAtResult = await client.query(
        'SELECT localtimestamp::text AS "importedAt"',
      );
      const importedAt = importedAtResult.rows[0].importedAt;
      const customerIds = new Map(
        [...customerBySourceKey.keys()].map((key) => [key, stableId(key)]),
      );
      const customerColumns = [
        'id',
        'type',
        'status',
        'firstName',
        'lastName',
        'nationalCode',
        'birthDate',
        'gender',
        'organizationName',
        'economicCode',
        'registrationNo',
        'nationalId',
        'mobile',
        'phone',
        'email',
        'province',
        'city',
        'address',
        'postalCode',
        'occupation',
        'occupationGroup',
        'registeredAt',
        'createdAt',
        'updatedAt',
      ];
      const customerRows = payload.customers.map((customer) => {
        const targetFields = customer.target;
        return [
          customerIds.get(customer.sourceKey),
          targetFields.type,
          targetFields.status,
          targetFields.firstName,
          targetFields.lastName,
          targetFields.nationalCode,
          targetFields.birthDate,
          targetFields.gender,
          targetFields.organizationName,
          targetFields.economicCode,
          targetFields.registrationNo,
          targetFields.nationalId,
          targetFields.mobile,
          targetFields.phone,
          targetFields.email,
          targetFields.province,
          targetFields.city,
          targetFields.address,
          targetFields.postalCode,
          targetFields.occupation,
          targetFields.occupationGroup,
          targetFields.registeredAt || importedAt,
          targetFields.createdAt || importedAt,
          importedAt,
        ];
      });

      const importedCustomers = await insertRows(
        client,
        'Customer',
        customerColumns,
        customerRows,
      );

      const addressColumns = [
        'id',
        'customerId',
        'title',
        'province',
        'city',
        'address',
        'postalCode',
        'map',
        'createdAt',
        'updatedAt',
      ];
      const addressRows = payload.addresses.map((address) => [
        stableId(address.sourceKey),
        customerIds.get(address.customerSourceKey),
        address.title,
        address.province,
        address.city,
        address.address,
        address.postalCode,
        address.mapRaw,
        importedAt,
        importedAt,
      ]);
      const importedAddresses = await insertRows(
        client,
        'CustomerAddress',
        addressColumns,
        addressRows,
      );

      const opportunityColumns = [
        'id',
        'customerId',
        'title',
        'description',
        'status',
        'priority',
        'estimatedValue',
        'probability',
        'expectedCloseAt',
        'nextFollowUpAt',
        'lossReason',
        'createdAt',
        'updatedAt',
      ];
      const opportunityRows = payload.opportunities.map((opportunity) => [
        stableId(opportunity.sourceKey),
        customerIds.get(opportunity.customerSourceKey),
        opportunity.target.title,
        opportunity.target.description,
        opportunity.target.status,
        opportunity.target.priority,
        opportunity.target.estimatedValue,
        opportunity.target.probability,
        null,
        null,
        opportunity.target.lossReason,
        opportunity.target.createdAt || importedAt,
        importedAt,
      ]);
      const importedOpportunities = await insertRows(
        client,
        'SalesOpportunity',
        opportunityColumns,
        opportunityRows,
      );

      const activityColumns = [
        'id',
        'customerId',
        'type',
        'title',
        'body',
        'relatedRepairId',
        'relatedSalesOpportunityId',
        'dueAt',
        'createdById',
        'createdAt',
        'updatedAt',
      ];
      const activityRows = payload.activities.map((activity) => [
        stableId(activity.sourceKey),
        customerIds.get(activity.customerSourceKey),
        activity.target.type,
        activity.target.title,
        activity.target.body,
        null,
        null,
        activity.target.dueAt || null,
        null,
        activity.target.createdAt || importedAt,
        importedAt,
      ]);
      const importedActivities = await insertRows(
        client,
        'CustomerActivity',
        activityColumns,
        activityRows,
      );

      await client.query('COMMIT');
      console.log(
        JSON.stringify(
          {
            ...plan,
            inserted: {
              customers: importedCustomers,
              addresses: importedAddresses,
              opportunities: importedOpportunities,
              activities: importedActivities,
            },
            skippedExistingDeterministicIds: {
              customers: customerRows.length - importedCustomers,
              addresses: addressRows.length - importedAddresses,
              opportunities: opportunityRows.length - importedOpportunities,
              activities: activityRows.length - importedActivities,
            },
            transaction: 'committed',
          },
          null,
          2,
        ),
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}
