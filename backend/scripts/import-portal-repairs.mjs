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
  './portal-repairs.normalized.json',
);
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const allowDocker = args.includes('--allow-docker');
const fileArgumentIndex = args.indexOf('--file');
const inputFile =
  fileArgumentIndex >= 0
    ? path.resolve(process.cwd(), args[fileArgumentIndex + 1] ?? '')
    : defaultFile;

if (args.includes('--help')) {
  console.log(
    'Usage: node scripts/import-portal-repairs.mjs [--file <path>] [--allow-docker] [--apply]',
  );
  console.log('Without --apply, validates the file and reports a dry run.');
  console.log(
    '--allow-docker also permits host postgres (database enterprise, user app).',
  );
  process.exit(0);
}

if (fileArgumentIndex >= 0 && !args[fileArgumentIndex + 1]) {
  throw new Error('--file requires a path');
}

function stableId(sourceKey) {
  return makeUuid(
    createHash('sha256')
      .update(`rahyaft-portal-repairs-v1\0${sourceKey}`)
      .digest()
      .subarray(0, 16),
  );
}

function stableCustomerId(sourceKey) {
  return makeUuid(
    createHash('sha256')
      .update(`rahyaft-portal-customers-crm-v1\0${sourceKey}`)
      .digest()
      .subarray(0, 16),
  );
}

function makeUuid(bytes) {
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validatePayload(payload) {
  if (
    payload?.format !== 'rahyaft.portal.repairs.normalized' ||
    payload.version !== 1
  ) {
    throw new Error('Unsupported or invalid portal repairs JSON format');
  }

  for (const key of ['customers', 'repairs', 'activities']) {
    if (!Array.isArray(payload[key])) {
      throw new Error(`Missing expected array: ${key}`);
    }
  }

  if (!Array.isArray(payload.existingCustomerSourceKeys)) {
    throw new Error('Missing existingCustomerSourceKeys');
  }
  const customerKeys = new Set(payload.existingCustomerSourceKeys);
  if (customerKeys.size !== payload.existingCustomerSourceKeys.length) {
    throw new Error('Duplicate existing customer source keys');
  }
  for (const customer of payload.customers) {
    if (!customer.sourceKey || customerKeys.has(customer.sourceKey)) {
      throw new Error(
        `Missing or duplicate repair customer: ${customer.sourceKey}`,
      );
    }
    if (!['PERSON', 'ORGANIZATION'].includes(customer.target?.type)) {
      throw new Error(`Invalid repair customer type: ${customer.sourceKey}`);
    }
    customerKeys.add(customer.sourceKey);
  }

  const repairKeys = new Set();
  const statuses = new Set([
    'REGISTERED',
    'WAITING_REVIEW',
    'WAITING_COST_APPROVAL',
    'APPROVED',
    'REJECTED',
    'IN_REPAIR',
    'QC',
    'READY_FOR_DELIVERY',
    'DELIVERED',
    'CLOSED',
    'CANCELED',
    'NO_REPAIR_REQUIRED',
  ]);
  for (const repair of payload.repairs) {
    if (!repair.sourceKey || repairKeys.has(repair.sourceKey)) {
      throw new Error(
        `Missing or duplicate repair source key: ${repair.sourceKey}`,
      );
    }
    if (!customerKeys.has(repair.customerSourceKey)) {
      throw new Error(`Unresolved customer for repair ${repair.sourceKey}`);
    }
    if (!['IN_HOUSE', 'ON_SITE'].includes(repair.target?.type)) {
      throw new Error(`Invalid repair type: ${repair.sourceKey}`);
    }
    if (!statuses.has(repair.target?.status)) {
      throw new Error(`Invalid repair status: ${repair.sourceKey}`);
    }
    if (!repair.target?.deviceTitle || !repair.target?.problemDescription) {
      throw new Error(`Repair is missing required fields: ${repair.sourceKey}`);
    }
    repairKeys.add(repair.sourceKey);
  }

  const activityKeys = new Set();
  for (const activity of payload.activities) {
    if (!activity.sourceKey || activityKeys.has(activity.sourceKey)) {
      throw new Error(
        `Missing or duplicate repair activity: ${activity.sourceKey}`,
      );
    }
    if (
      !customerKeys.has(activity.customerSourceKey) ||
      !repairKeys.has(activity.repairSourceKey)
    ) {
      throw new Error(
        `Unresolved repair activity references: ${activity.sourceKey}`,
      );
    }
    activityKeys.add(activity.sourceKey);
  }
}

function isUnknownRepairCustomer(customer) {
  const nameParts = [
    customer.target?.firstName,
    customer.target?.lastName,
    customer.target?.organizationName,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return (
    nameParts.length === 0 ||
    (nameParts.length === 1 &&
      nameParts[0].toLocaleLowerCase() === 'portal repair customer')
  );
}

async function insertRows(
  client,
  table,
  columns,
  rows,
  batchSize = 400,
  conflictClause = 'ON CONFLICT ("id") DO NOTHING',
) {
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
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES ${placeholders.join(', ')} ${conflictClause}`,
      values,
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

const payload = JSON.parse(await readFile(inputFile, 'utf8'));
validatePayload(payload);
const unknownCustomerSourceKeys = new Set(
  payload.customers
    .filter(isUnknownRepairCustomer)
    .map((customer) => customer.sourceKey),
);
const unknownCustomerIdsFromPayload = [...unknownCustomerSourceKeys].map(
  stableId,
);
const unknownCustomerId = stableCustomerId('portal-repair-customer:unknown');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set; run the importer from backend/');
}
const connection = new URL(databaseUrl);
const databaseName = decodeURIComponent(connection.pathname.slice(1));
if (
  ![
    'localhost',
    '127.0.0.1',
    '::1',
    ...(allowDocker ? ['postgres'] : []),
  ].includes(connection.hostname) ||
  databaseName !== 'enterprise'
) {
  throw new Error(
    `Refusing database target ${connection.hostname}/${databaseName}; expected localhost/enterprise (or postgres/enterprise with --allow-docker)`,
  );
}

const customerIds = new Map(
  payload.existingCustomerSourceKeys
    .map((sourceKey) => [sourceKey, stableCustomerId(sourceKey)])
    .concat(
      payload.customers.map((customer) => [
        customer.sourceKey,
        unknownCustomerSourceKeys.has(customer.sourceKey)
          ? unknownCustomerId
          : stableId(customer.sourceKey),
      ]),
    ),
);
const repairIds = new Map(
  payload.repairs.map((repair) => [
    repair.sourceKey,
    stableId(repair.sourceKey),
  ]),
);
const obsoleteStatusLogIds = [
  ...payload.repairs.map((repair) =>
    stableId(`repair-status-log:portal-repair-completion:${repair.sourceKey}`),
  ),
  ...payload.activities
    .filter((activity) => activity.target?.type === 'REPAIR_STATUS_CHANGED')
    .map((activity) => stableId(`repair-status-log:${activity.sourceKey}`)),
];
const plannedRepairIds = [...repairIds.values()];
const plannedCaseNumbers = payload.repairs.map(
  (repair) => repair.target.caseNumber,
);
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
    throw new Error(
      'Connected database identity differs from expected dev target',
    );
  }

  const existingUnknownCustomers = await client.query(
    `
      SELECT id
      FROM "Customer"
      WHERE id = ANY($1::text[])
         OR (
           lower(btrim(COALESCE("firstName", ''))) = 'portal repair customer'
           AND btrim(COALESCE("lastName", '')) = ''
           AND btrim(COALESCE("organizationName", '')) = ''
         )
    `,
    [unknownCustomerIdsFromPayload],
  );
  const unknownCustomerIds = [
    ...new Set([
      ...unknownCustomerIdsFromPayload,
      ...existingUnknownCustomers.rows.map((row) => row.id),
    ]),
  ].filter((id) => id !== unknownCustomerId);
  const [repairsToConsolidate, activitiesToConsolidate] = await Promise.all([
    client.query(
      'SELECT count(*)::int AS count FROM "RepairCase" WHERE "customerId" = ANY($1::text[])',
      [unknownCustomerIds],
    ),
    client.query(
      'SELECT count(*)::int AS count FROM "CustomerActivity" WHERE "customerId" = ANY($1::text[])',
      [unknownCustomerIds],
    ),
  ]);

  const existingCustomerIds = payload.existingCustomerSourceKeys.map(
    (sourceKey) => customerIds.get(sourceKey),
  );
  const linkedCustomers = await client.query(
    'SELECT count(*)::int AS count FROM "Customer" WHERE id = ANY($1::text[])',
    [existingCustomerIds],
  );
  if (linkedCustomers.rows[0].count !== existingCustomerIds.length) {
    throw new Error(
      `Expected ${existingCustomerIds.length} previously imported portal customers, found ${linkedCustomers.rows[0].count}. Run "node scripts/import-portal-customers-crm.mjs --apply" first, then retry this importer.`,
    );
  }

  const repairCollisions = await client.query(
    `
      SELECT
        count(*) FILTER (WHERE id = ANY($1::text[]))::int AS existing_ids,
        count(*) FILTER (
          WHERE "caseNumber" = ANY($2::text[])
            AND id <> ALL($1::text[])
        )::int AS case_number_conflicts
      FROM "RepairCase"
    `,
    [plannedRepairIds, plannedCaseNumbers],
  );
  if (repairCollisions.rows[0].case_number_conflicts > 0) {
    throw new Error(
      `Found ${repairCollisions.rows[0].case_number_conflicts} unrelated repair case-number conflicts`,
    );
  }

  const obsoleteStatusLogs = await client.query(
    'SELECT count(*)::int AS count FROM "RepairStatusLog" WHERE id = ANY($1::text[])',
    [obsoleteStatusLogIds],
  );

  const before = await client.query(`
    SELECT 'customers' AS entity, count(*)::int AS count FROM "Customer"
    UNION ALL SELECT 'repairs', count(*)::int FROM "RepairCase"
    UNION ALL SELECT 'repairActivities', count(*)::int FROM "CustomerActivity"
    UNION ALL SELECT 'repairStatusLogs', count(*)::int FROM "RepairStatusLog"
  `);
  const plan = {
    database: target.rows[0].database,
    mode: apply ? 'resumable-upsert' : 'dry-run',
    file: inputFile,
    rows: {
      newCustomers: payload.customers.length - unknownCustomerSourceKeys.size,
      repairs: payload.repairs.length,
      repairEventsAndNotes: payload.activities.length,
    },
    cleanup: {
      obsoleteSyntheticStatusLogs: obsoleteStatusLogs.rows[0].count,
    },
    unknownCustomerConsolidation: {
      sourceCustomers: unknownCustomerSourceKeys.size,
      existingCustomerRecords: unknownCustomerIds.length,
      repairsToReassign: repairsToConsolidate.rows[0].count,
      activitiesToReassign: activitiesToConsolidate.rows[0].count,
      sharedCustomerId: unknownCustomerId,
    },
    existing: Object.fromEntries(
      before.rows.map((row) => [row.entity, row.count]),
    ),
    alreadyImportedRepairIds: repairCollisions.rows[0].existing_ids,
    mapping: payload.counts,
  };

  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    console.log('Dry run only. Re-run with --apply to import.');
  } else {
    await client.query('BEGIN');
    try {
      const importedAtResult = await client.query(
        'SELECT localtimestamp::text AS "importedAt"',
      );
      const importedAt = importedAtResult.rows[0].importedAt;

      const customerRows = payload.customers
        .filter(
          (customer) => !unknownCustomerSourceKeys.has(customer.sourceKey),
        )
        .map((customer) => [
          customerIds.get(customer.sourceKey),
          customer.target.type,
          customer.target.status,
          customer.target.firstName,
          customer.target.lastName,
          customer.target.mobile,
          customer.target.phone,
          customer.target.email,
          customer.target.province,
          customer.target.city,
          customer.target.address,
          importedAt,
          importedAt,
          importedAt,
        ]);
      const importedCustomers = await insertRows(
        client,
        'Customer',
        [
          'id',
          'type',
          'status',
          'firstName',
          'lastName',
          'mobile',
          'phone',
          'email',
          'province',
          'city',
          'address',
          'registeredAt',
          'createdAt',
          'updatedAt',
        ],
        customerRows,
      );

      if (unknownCustomerSourceKeys.size > 0 || unknownCustomerIds.length > 0) {
        await insertRows(
          client,
          'Customer',
          [
            'id',
            'type',
            'status',
            'firstName',
            'lastName',
            'mobile',
            'phone',
            'email',
            'province',
            'city',
            'address',
            'registeredAt',
            'createdAt',
            'updatedAt',
          ],
          [
            [
              unknownCustomerId,
              'PERSON',
              'ACTIVE',
              'نامشخص',
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              importedAt,
              importedAt,
              importedAt,
            ],
          ],
        );
        const sharedCustomer = await client.query(
          'SELECT "type", "firstName", "lastName", "organizationName" FROM "Customer" WHERE id = $1',
          [unknownCustomerId],
        );
        if (
          sharedCustomer.rows[0]?.type !== 'PERSON' ||
          sharedCustomer.rows[0]?.firstName !== 'نامشخص' ||
          sharedCustomer.rows[0]?.lastName ||
          sharedCustomer.rows[0]?.organizationName
        ) {
          throw new Error(
            'The deterministic shared unknown customer ID is already used by a different customer',
          );
        }

        for (const table of [
          'RepairCase',
          'CustomerActivity',
          'SalesOpportunity',
          'CustomerContact',
          'CustomerAddress',
          'CustomerAiAnalysis',
        ]) {
          await client.query(
            `UPDATE "${table}" SET "customerId" = $1 WHERE "customerId" = ANY($2::text[])`,
            [unknownCustomerId, unknownCustomerIds],
          );
        }
        await client.query(
          'DELETE FROM "Customer" WHERE id = ANY($1::text[])',
          [unknownCustomerIds],
        );
      }

      const repairRows = payload.repairs.map((repair) => [
        repairIds.get(repair.sourceKey),
        repair.target.caseNumber,
        customerIds.get(repair.customerSourceKey),
        repair.target.type,
        repair.target.status,
        null,
        repair.target.description,
        repair.target.needCostApproval,
        repair.target.estimatedCost,
        repair.target.startedAt,
        repair.target.completedAt,
        repair.target.createdAt || importedAt,
        importedAt,
        repair.target.deviceTitle,
        repair.target.serialNumber,
        repair.target.problemDescription,
      ]);
      const appliedRepairs = await insertRows(
        client,
        'RepairCase',
        [
          'id',
          'caseNumber',
          'customerId',
          'type',
          'status',
          'technicianId',
          'description',
          'needCostApproval',
          'estimatedCost',
          'startedAt',
          'completedAt',
          'createdAt',
          'updatedAt',
          'deviceTitle',
          'serialNumber',
          'problemDescription',
        ],
        repairRows,
        400,
        `ON CONFLICT ("id") DO UPDATE SET
          "status" = EXCLUDED."status",
          "startedAt" = COALESCE("RepairCase"."startedAt", EXCLUDED."startedAt"),
          "completedAt" = EXCLUDED."completedAt",
          "updatedAt" = EXCLUDED."updatedAt"`,
      );

      const activityRows = payload.activities.map((activity) => [
        stableId(activity.sourceKey),
        customerIds.get(activity.customerSourceKey),
        activity.target.type,
        activity.target.title,
        activity.target.body,
        repairIds.get(activity.repairSourceKey),
        null,
        activity.target.dueAt,
        null,
        activity.target.createdAt || importedAt,
        importedAt,
      ]);
      const importedActivities = await insertRows(
        client,
        'CustomerActivity',
        [
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
        ],
        activityRows,
      );

      const deletedStatusLogs = await client.query(
        'DELETE FROM "RepairStatusLog" WHERE id = ANY($1::text[])',
        [obsoleteStatusLogIds],
      );

      await client.query('COMMIT');
      console.log(
        JSON.stringify(
          {
            ...plan,
            inserted: {
              customers: importedCustomers,
              repairs:
                repairRows.length - repairCollisions.rows[0].existing_ids,
              repairEventsAndNotes: importedActivities,
            },
            updated: {
              repairs: repairCollisions.rows[0].existing_ids,
            },
            applied: {
              repairs: appliedRepairs,
            },
            skippedExistingDeterministicIds: {
              customers: customerRows.length - importedCustomers,
              repairEventsAndNotes: activityRows.length - importedActivities,
            },
            cleanedUp: {
              obsoleteSyntheticStatusLogs: deletedStatusLogs.rowCount ?? 0,
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
