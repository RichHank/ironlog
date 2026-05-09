// Quick correctness check for src/fit.ts. Not a full FIT decoder —
// just validates the spec-mandatory invariants:
//   1. ".FIT" signature at byte 8.
//   2. Header CRC matches the first 12 bytes.
//   3. data_size in the header == bytes between header end and file CRC.
//   4. File CRC over (header + body) matches the trailing 2 bytes.
//   5. file_id is the first record (record header byte == 0x40 — definition
//      message for local 0).
//
// Run: node --experimental-strip-types scripts/smoke-fit.mts

import { encodeWorkoutAsFit } from '../src/fit.ts';
import type { WorkoutSession } from '../src/types.ts';

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400,
  0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401,
  0x5000, 0x9c01, 0x8801, 0x4400,
];

function fitCrc(bytes: Uint8Array): number {
  let crc = 0;
  for (const b of bytes) {
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >>> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[b & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >>> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(b >>> 4) & 0xf];
  }
  return crc & 0xffff;
}

const start = Date.parse('2026-05-09T08:00:00Z');
const end   = Date.parse('2026-05-09T09:15:00Z');

const session: WorkoutSession = {
  id: 'smoke',
  startedAt: start,
  completedAt: end,
  exercises: [
    {
      id: 'e1', exerciseKey: 'back_squat', name: 'Back Squat',
      sets: [
        { id: 's1', weight: 135, reps: 5, rpe: null, type: 'warmup', completedAt: start + 5 * 60_000 },
        { id: 's2', weight: 225, reps: 5, rpe: 7, type: 'normal', completedAt: start + 10 * 60_000 },
        { id: 's3', weight: 275, reps: 3, rpe: 9, type: 'normal', completedAt: start + 15 * 60_000 },
      ],
    },
    {
      id: 'e2', exerciseKey: 'bench_press', name: 'Bench Press',
      sets: [
        { id: 's4', weight: 185, reps: 5, rpe: 8, type: 'normal', completedAt: start + 30 * 60_000 },
        { id: 's5', weight: null, reps: 12, rpe: null, type: 'normal', completedAt: start + 35 * 60_000 }, // bodyweight
      ],
    },
  ],
};

const bytes = encodeWorkoutAsFit(session, { weightUnit: 'lb' });

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else    { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

console.log(`Encoded ${bytes.length} bytes.`);
console.log('First 16 bytes:', Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));

check('header size byte', bytes[0] === 14);
check('protocol version', bytes[1] === 0x20);
check('".FIT" signature', String.fromCharCode(...bytes.slice(8, 12)) === '.FIT');

const dataSize = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
check('data_size matches body length', dataSize === bytes.length - 14 - 2,
  `header says ${dataSize}, actual ${bytes.length - 14 - 2}`);

const headerCrcStored = bytes[12] | (bytes[13] << 8);
const headerCrcCalc = fitCrc(bytes.slice(0, 12));
check('header CRC', headerCrcStored === headerCrcCalc,
  `stored 0x${headerCrcStored.toString(16)}, calc 0x${headerCrcCalc.toString(16)}`);

const fileCrcStored = bytes[bytes.length - 2] | (bytes[bytes.length - 1] << 8);
const fileCrcCalc = fitCrc(bytes.slice(0, bytes.length - 2));
check('file CRC', fileCrcStored === fileCrcCalc,
  `stored 0x${fileCrcStored.toString(16)}, calc 0x${fileCrcCalc.toString(16)}`);

// First record is at offset 14. It should be a definition message for local 0.
check('first record is definition (local 0)', bytes[14] === 0x40);
// Followed by global msg num for file_id (= 0). Bytes 14+3, 14+4 are the LE u16.
check('first definition is for file_id (msg 0)', bytes[17] === 0 && bytes[18] === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
