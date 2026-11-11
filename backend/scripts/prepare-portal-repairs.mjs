import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const fileIndex = args.indexOf('--file');
const outputIndex = args.indexOf('--output');
const inputFile = path.resolve(
  process.cwd(),
  fileIndex >= 0
    ? (args[fileIndex + 1] ?? '')
    : 'scripts/portal-repairs.normalized.json',
);
const outputFile = path.resolve(
  process.cwd(),
  outputIndex >= 0 ? (args[outputIndex + 1] ?? '') : inputFile,
);

if (args.includes('--help')) {
  console.log(
    'Usage: node scripts/prepare-portal-repairs.mjs [--file <path>] [--output <path>]',
  );
  console.log(
    'Marks every repair CLOSED, fills historical start/completion dates, and preserves source events/notes as repair-linked activities.',
  );
  process.exit(0);
}
if (fileIndex >= 0 && !args[fileIndex + 1]) {
  throw new Error('--file requires a path');
}
if (outputIndex >= 0 && !args[outputIndex + 1]) {
  throw new Error('--output requires a path');
}

const payload = JSON.parse(await readFile(inputFile, 'utf8'));
if (
  payload?.format !== 'rahyaft.portal.repairs.normalized' ||
  payload.version !== 1 ||
  !Array.isArray(payload.repairs) ||
  !Array.isArray(payload.activities)
) {
  throw new Error('Unsupported or invalid portal repairs JSON format');
}

const activitiesByRepair = new Map();
for (const activity of payload.activities) {
  const list = activitiesByRepair.get(activity.repairSourceKey) ?? [];
  list.push(activity);
  activitiesByRepair.set(activity.repairSourceKey, list);
}

for (const repair of payload.repairs) {
  const activities = (activitiesByRepair.get(repair.sourceKey) ?? []).sort(
    (a, b) =>
      String(a.target?.createdAt ?? '').localeCompare(
        String(b.target?.createdAt ?? ''),
      ) || String(a.sourceKey).localeCompare(String(b.sourceKey)),
  );
  const datedEvents = [
    repair.target.createdAt,
    repair.target.startedAt,
    repair.target.completedAt,
    ...activities.map((activity) => activity.target?.createdAt),
  ].filter(Boolean);
  const completedAt = datedEvents.sort().at(-1) ?? repair.target.createdAt;
  if (!completedAt) {
    throw new Error(`Repair has no usable date: ${repair.sourceKey}`);
  }

  repair.target.status = 'CLOSED';
  repair.target.startedAt ??= repair.target.createdAt;
  repair.target.completedAt = completedAt;
  if (repair.source) delete repair.source.statusBeforeCompletion;
}

delete payload.statusLogs;
payload.counts = {
  ...payload.counts,
  completedRepairs: payload.repairs.length,
  repairEventsAndNotes: payload.activities.length,
};
delete payload.counts.normalizedStatusLogs;
payload.notes = [
  ...(Array.isArray(payload.notes)
    ? payload.notes.filter(
        (note) =>
          note !==
          'RepairStatusLog rows include every source status-change event plus one deterministic completion event per repair.',
      )
    : []),
  'Every imported repair is CLOSED. startedAt defaults to the source creation date and completedAt is the latest source event date.',
  'Source repair events and notes are imported as CustomerActivity rows linked by relatedRepairId.',
].filter((note, index, notes) => notes.indexOf(note) === index);

await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      inputFile,
      outputFile,
      repairsClosed: payload.repairs.length,
      repairEventsAndNotes: payload.activities.length,
    },
    null,
    2,
  ),
);
