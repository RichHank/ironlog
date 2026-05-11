// Minimal FIT-format encoder for IronLog strength sessions.
//
// FIT (Flexible and Interoperable Data Transfer) is Garmin's binary file
// format and the de-facto lingua franca of fitness platforms — Garmin
// Connect, Strava, Apple Health (via HealthFit), Health Connect (via
// Garmin Connect) all read it. Crucially for us, FIT preserves
// structured strength data (sets, reps, weights) which Strava's API
// cannot.
//
// Spec reference: Garmin FIT SDK Profile 21.x. We only emit a small
// subset: file_id, activity, session, lap, set.

import type { WorkoutSession } from './types';

// FIT timestamps are seconds since 1989-12-31 00:00:00 UTC, not Unix epoch.
const FIT_EPOCH_OFFSET = 631065600;

const PROTOCOL_VERSION = 0x20; // 2.0
const PROFILE_VERSION = 2140;  // 21.40

// FIT base type bytes. High bit indicates the type spans multiple bytes
// and therefore is endian-aware.
const BT_ENUM = 0x00;
const BT_UINT8 = 0x02;
const BT_UINT16 = 0x84;
const BT_UINT32 = 0x86;
const BT_UINT32Z = 0x8c;

// Global message numbers
const MSG_FILE_ID = 0;
const MSG_SESSION = 18;
const MSG_LAP = 19;
const MSG_ACTIVITY = 34;
const MSG_SET = 225;

const SPORT_TRAINING = 10;
const SUB_SPORT_STRENGTH_TRAINING = 20;

// Spoof Garmin manufacturer (1) and Fenix 6 product (3289) to bypass
// Android Garmin Connect Mobile's "Course" import bug.
const MANUFACTURER_GARMIN = 1;
const PRODUCT_FENIX_6 = 3289;

const SET_TYPE_ACTIVE = 1;

// fit_base_unit enum
const UNIT_KG = 1;
const UNIT_LB = 2;

const INVALID_U16 = 0xffff;
// INVALID_U16 (0xFFFF) is the FIT-spec sentinel for "no data."
// Garmin Connect rejects non-standard values like 65534 in enum fields.

// FIT uses a custom 16-bit CRC with a 4-bit lookup table (per the SDK).
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

class FitWriter {
  private bytes: number[] = [];

  u8(v: number): void { this.bytes.push(v & 0xff); }
  u16(v: number): void { this.bytes.push(v & 0xff, (v >>> 8) & 0xff); }
  u32(v: number): void {
    this.bytes.push(
      v & 0xff,
      (v >>> 8) & 0xff,
      (v >>> 16) & 0xff,
      (v >>> 24) & 0xff,
    );
  }
  raw(arr: readonly number[]): void { for (const b of arr) this.bytes.push(b & 0xff); }

  size(): number { return this.bytes.length; }
  toUint8(): Uint8Array { return new Uint8Array(this.bytes); }
}

type FieldDef = readonly [defNum: number, size: number, baseType: number];

// Definition message: declares the schema for subsequent data messages
// sharing the given local ID, until redefined.
function writeDefinition(
  w: FitWriter,
  localId: number,
  globalMsgNum: number,
  fields: readonly FieldDef[],
): void {
  w.u8(0x40 | (localId & 0x0f)); // record header (definition)
  w.u8(0);                        // reserved
  w.u8(0);                        // architecture: 0 = little-endian
  w.u16(globalMsgNum);
  w.u8(fields.length);
  for (const [defNum, size, baseType] of fields) {
    w.u8(defNum);
    w.u8(size);
    w.u8(baseType);
  }
}

function writeDataHeader(w: FitWriter, localId: number): void {
  w.u8(0x00 | (localId & 0x0f));
}

function fitTime(unixMs: number): number {
  return Math.max(0, Math.floor(unixMs / 1000) - FIT_EPOCH_OFFSET);
}

// Best-effort keyword match against the FIT exercise_category enum.
// Unmatched lifts get UNKNOWN — Garmin Connect still shows reps/weight,
// just without the category icon.
function exerciseCategory(exerciseKey: string, name: string): number {
  const s = (exerciseKey + ' ' + name).toLowerCase();
  if (/\b(back ?squat|front ?squat|squat)\b/.test(s)) return 28;
  if (/\b(deadlift|rdl|romanian)\b/.test(s)) return 8;
  if (/\bbench( press)?\b/.test(s)) return 0;
  if (/\bcurl\b/.test(s)) return 7;
  if (/\brow\b/.test(s)) return 23;
  if (/\b(ohp|overhead press|shoulder press|military press)\b/.test(s)) return 24;
  if (/\b(pull[- ]?up|chin[- ]?up|pulldown|lat ?pull)\b/.test(s)) return 21;
  if (/\bpush[- ]?up\b/.test(s)) return 22;
  if (/\blunge\b/.test(s)) return 17;
  if (/\bshrug\b/.test(s)) return 26;
  if (/\bplank\b/.test(s)) return 19;
  if (/\b(sit[- ]?up|crunch)\b/.test(s)) return 27;
  if (/\b(triceps|skullcrusher)\b/.test(s)) return 30;
  if (/\b(lateral|side raise|delt fly)\b/.test(s)) return 14;
  if (/\b(calf raise|calves)\b/.test(s)) return 1;
  if (/\b(leg curl|hamstring curl)\b/.test(s)) return 15;
  if (/\b(leg raise|knee raise|hanging leg)\b/.test(s)) return 16;
  if (/\b(hyperextension|back ext)\b/.test(s)) return 13;
  if (/\bflye?\b/.test(s)) return 9;
  return INVALID_U16;
}

function lbToKg(lb: number): number {
  return lb / 2.20462262;
}

export interface FitEncodeOptions {
  weightUnit: 'lb' | 'kg';
}

export function encodeWorkoutAsFit(
  session: WorkoutSession,
  opts: FitEncodeOptions,
): Uint8Array {
  const body = new FitWriter();

  const startTs = fitTime(session.startedAt);
  const endTs = fitTime(session.completedAt);
  const elapsedMs = Math.max(60_000, session.completedAt - session.startedAt);
  const displayUnit = opts.weightUnit === 'lb' ? UNIT_LB : UNIT_KG;

  // ── file_id (local 0) — required first record ─────────────────────────
  // When manufacturer=255 (development), Garmin Connect requires
  // developer_id and application_id to identify the source. Since we are
  // spoofing Garmin (1), we must remove these fields or it may fail validation.
  writeDefinition(body, 0, MSG_FILE_ID, [
    [3, 4, BT_UINT32Z], // serial_number
    [4, 4, BT_UINT32],  // time_created
    [1, 2, BT_UINT16],  // manufacturer
    [2, 2, BT_UINT16],  // product
    [0, 1, BT_ENUM],    // type (4 = activity)
  ]);
  writeDataHeader(body, 0);
  // Deterministic serial from session id (simple djb2 hash).
  let serial = 5381;
  for (let i = 0; i < session.id.length; i++) {
    serial = ((serial << 5) + serial + session.id.charCodeAt(i)) >>> 0;
  }
  body.u32(serial);
  body.u32(startTs);
  body.u16(MANUFACTURER_GARMIN);
  body.u16(PRODUCT_FENIX_6); // Spoofed to bypass Course bug
  body.u8(4);

  // ── set messages (local 1) ────────────────────────────────────────────
  writeDefinition(body, 1, MSG_SET, [
    [254, 2, BT_UINT16], // message_index
    [253, 4, BT_UINT32], // timestamp
    [0, 4, BT_UINT32],   // duration (ms)
    [3, 2, BT_UINT16],   // repetitions
    [4, 2, BT_UINT16],   // weight (kg * 16)
    [5, 1, BT_UINT8],    // set_type
    [6, 4, BT_UINT32],   // start_time
    [7, 2, BT_UINT16],   // category (single)
    [9, 2, BT_UINT16],   // weight_display_unit
  ]);

  let setIndex = 0;
  for (const ex of session.exercises) {
    const cat = exerciseCategory(ex.exerciseKey, ex.name);
    for (const s of ex.sets) {
      // Skip empty sets — they'd just bloat the file with no info.
      if (s.weight == null && s.reps == null) continue;

      const setEnd = fitTime(s.completedAt);
      // We don't track per-set duration; assume ~30s active time.
      const setStart = fitTime(s.completedAt - 30_000);
      const reps = s.reps != null ? s.reps : INVALID_U16;
      let weightRaw = INVALID_U16;
      if (s.weight != null) {
        const kg = opts.weightUnit === 'lb' ? lbToKg(s.weight) : s.weight;
        weightRaw = Math.max(0, Math.min(0xfffe, Math.round(kg * 16)));
      }

      writeDataHeader(body, 1);
      body.u16(setIndex++);
      body.u32(setEnd);
      body.u32(30_000);
      body.u16(reps);
      body.u16(weightRaw);
      body.u8(SET_TYPE_ACTIVE);
      body.u32(setStart);
      body.u16(cat);
      body.u16(displayUnit);
    }
  }

  // ── lap (local 2) — one lap covering the whole session ────────────────
  writeDefinition(body, 2, MSG_LAP, [
    [254, 2, BT_UINT16], // message_index
    [253, 4, BT_UINT32], // timestamp
    [2, 4, BT_UINT32],   // start_time
    [7, 4, BT_UINT32],   // total_elapsed_time (ms)
    [8, 4, BT_UINT32],   // total_timer_time (ms)
    [25, 1, BT_ENUM],    // sport
    [39, 1, BT_ENUM],    // sub_sport
    [0, 1, BT_ENUM],     // event (9 = lap)
    [1, 1, BT_ENUM],     // event_type (1 = stop)
  ]);
  writeDataHeader(body, 2);
  body.u16(0);
  body.u32(endTs);
  body.u32(startTs);
  body.u32(elapsedMs);
  body.u32(elapsedMs);
  body.u8(SPORT_TRAINING);
  body.u8(SUB_SPORT_STRENGTH_TRAINING);
  body.u8(9);
  body.u8(1);

  // ── session (local 3) ─────────────────────────────────────────────────
  writeDefinition(body, 3, MSG_SESSION, [
    [254, 2, BT_UINT16], // message_index
    [253, 4, BT_UINT32], // timestamp
    [2, 4, BT_UINT32],   // start_time
    [7, 4, BT_UINT32],   // total_elapsed_time
    [8, 4, BT_UINT32],   // total_timer_time
    [5, 1, BT_ENUM],     // sport
    [6, 1, BT_ENUM],     // sub_sport
    [0, 1, BT_ENUM],     // event (8 = session)
    [1, 1, BT_ENUM],     // event_type (1 = stop)
    [26, 2, BT_UINT16],  // num_laps
    [30, 2, BT_UINT16],  // num_sets
  ]);
  writeDataHeader(body, 3);
  body.u16(0);
  body.u32(endTs);
  body.u32(startTs);
  body.u32(elapsedMs);
  body.u32(elapsedMs);
  body.u8(SPORT_TRAINING);
  body.u8(SUB_SPORT_STRENGTH_TRAINING);
  body.u8(8);
  body.u8(1);
  body.u16(1);
  body.u16(setIndex);

  // ── activity (local 4) ────────────────────────────────────────────────
  writeDefinition(body, 4, MSG_ACTIVITY, [
    [253, 4, BT_UINT32], // timestamp
    [0, 4, BT_UINT32],   // total_timer_time
    [1, 2, BT_UINT16],   // num_sessions
    [2, 1, BT_ENUM],     // type (0 = manual)
    [3, 1, BT_ENUM],     // event (26 = activity)
    [4, 1, BT_ENUM],     // event_type (1 = stop)
  ]);
  writeDataHeader(body, 4);
  body.u32(endTs);
  body.u32(elapsedMs);
  body.u16(1);
  body.u8(0);
  body.u8(26);
  body.u8(1);

  // ── header ────────────────────────────────────────────────────────────
  // 14-byte header with header CRC. data_size excludes both header and
  // file CRC.
  const header = new FitWriter();
  header.u8(14);
  header.u8(PROTOCOL_VERSION);
  header.u16(PROFILE_VERSION);
  header.u32(body.size());
  header.raw([0x2e, 0x46, 0x49, 0x54]); // ".FIT"
  const headerNoCrc = header.toUint8();
  header.u16(fitCrc(headerNoCrc));

  // ── stitch ────────────────────────────────────────────────────────────
  const headerBytes = header.toUint8();
  const bodyBytes = body.toUint8();
  const out = new Uint8Array(headerBytes.length + bodyBytes.length + 2);
  out.set(headerBytes, 0);
  out.set(bodyBytes, headerBytes.length);
  // File CRC covers header + body, stored as the final 2 bytes.
  const fileCrc = fitCrc(out.subarray(0, headerBytes.length + bodyBytes.length));
  out[out.length - 2] = fileCrc & 0xff;
  out[out.length - 1] = (fileCrc >>> 8) & 0xff;

  return out;
}

export function fitFilenameFor(session: WorkoutSession): string {
  const d = new Date(session.startedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `ironlog-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.fit`;
}
