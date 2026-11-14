import "server-only";
import type { SQLInputValue } from "node:sqlite";
import { getDb } from "@/lib/db";
import { pickLocalized, type Locale } from "@/i18n/config";
import { columnsFor, RESOURCES, type AdminRow, type ResourceName } from "@/lib/resources";
import type { LeadInput, LeadStatus } from "@/lib/validators";

type Row = Record<string, unknown>;

/* ----------------------------- Public content ----------------------------- */

export interface PublicCourse {
  id: number;
  category: string;
  level: string;
  format: string;
  durationMonths: number;
  price: number;
  title: string;
  summary: string;
  program: string[];
}

export interface PublicProject {
  id: number;
  category: string;
  author: string;
  tags: string[];
  demoUrl: string;
  repoUrl: string;
  accent: number;
  title: string;
  description: string;
}

export interface PublicReview {
  id: number;
  author: string;
  rating: number;
  role: string;
  text: string;
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getPublicCourses(locale: Locale): PublicCourse[] {
  const rows = getDb()
    .prepare("SELECT * FROM courses WHERE published = 1 ORDER BY sort_order, id")
    .all() as Row[];
  return rows.map((row) => ({
    id: Number(row.id),
    category: String(row.category),
    level: String(row.level),
    format: String(row.format),
    durationMonths: Number(row.duration_months),
    price: Number(row.price),
    title: pickLocalized(row, "title", locale),
    summary: pickLocalized(row, "summary", locale),
    program: splitLines(pickLocalized(row, "program", locale)),
  }));
}

export function getPublicProjects(locale: Locale): PublicProject[] {
  const rows = getDb()
    .prepare("SELECT * FROM projects WHERE published = 1 ORDER BY sort_order, id")
    .all() as Row[];
  return rows.map((row) => ({
    id: Number(row.id),
    category: String(row.category),
    author: String(row.author),
    tags: String(row.tags)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    demoUrl: String(row.demo_url),
    repoUrl: String(row.repo_url),
    accent: Number(row.accent) || 0,
    title: pickLocalized(row, "title", locale),
    description: pickLocalized(row, "description", locale),
  }));
}

export function getPublicReviews(locale: Locale): PublicReview[] {
  const rows = getDb()
    .prepare("SELECT * FROM reviews WHERE approved = 1 ORDER BY sort_order, id")
    .all() as Row[];
  return rows.map((row) => ({
    id: Number(row.id),
    author: String(row.author),
    rating: Number(row.rating),
    role: pickLocalized(row, "role", locale),
    text: pickLocalized(row, "text", locale),
  }));
}

/* -------------------------------- Settings -------------------------------- */

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function saveSettings(values: Record<string, string>): void {
  const db = getDb();
  const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  db.exec("BEGIN");
  try {
    for (const [key, value] of Object.entries(values)) stmt.run(key, value);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/* --------------------------------- Leads ---------------------------------- */

export interface Lead {
  id: number;
  name: string;
  contact: string;
  courseId: number | null;
  courseTitle: string | null;
  message: string;
  locale: string;
  status: LeadStatus;
  createdAt: string;
}

export function createLead(input: LeadInput): number {
  // Only link to a course that exists and is published; ignore forged ids.
  const courseId =
    input.courseId && getDb().prepare("SELECT 1 FROM courses WHERE id = ? AND published = 1").get(input.courseId)
      ? input.courseId
      : null;
  const result = getDb()
    .prepare("INSERT INTO leads (name, contact, course_id, message, locale) VALUES (?, ?, ?, ?, ?)")
    .run(input.name, input.contact, courseId, input.message, input.locale);
  return Number(result.lastInsertRowid);
}

const MAX_LEADS_LISTED = 500;

export function listLeads(limit = MAX_LEADS_LISTED): Lead[] {
  const rows = getDb()
    .prepare(
      `SELECT leads.*, courses.title_ru AS course_title
       FROM leads LEFT JOIN courses ON courses.id = leads.course_id
       ORDER BY leads.id DESC
       LIMIT ?`,
    )
    .all(Math.min(Math.max(1, Math.trunc(limit)), MAX_LEADS_LISTED)) as Row[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    contact: String(row.contact),
    courseId: row.course_id === null ? null : Number(row.course_id),
    courseTitle: row.course_title === null ? null : String(row.course_title),
    message: String(row.message),
    locale: String(row.locale),
    status: String(row.status) as LeadStatus,
    createdAt: String(row.created_at),
  }));
}

export function updateLeadStatus(id: number, status: LeadStatus): boolean {
  return Number(getDb().prepare("UPDATE leads SET status = ? WHERE id = ?").run(status, id).changes) > 0;
}

export function deleteLead(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM leads WHERE id = ?").run(id).changes) > 0;
}

export interface DashboardStats {
  leadsNew: number;
  leadsTotal: number;
  courses: number;
  projects: number;
  reviewsPending: number;
  reviewsApproved: number;
}

export function getDashboardStats(): DashboardStats {
  const count = (sql: string): number => Number((getDb().prepare(sql).get() as { n: number }).n);
  return {
    leadsNew: count("SELECT COUNT(*) AS n FROM leads WHERE status = 'new'"),
    leadsTotal: count("SELECT COUNT(*) AS n FROM leads"),
    courses: count("SELECT COUNT(*) AS n FROM courses WHERE published = 1"),
    projects: count("SELECT COUNT(*) AS n FROM projects WHERE published = 1"),
    reviewsPending: count("SELECT COUNT(*) AS n FROM reviews WHERE approved = 0"),
    reviewsApproved: count("SELECT COUNT(*) AS n FROM reviews WHERE approved = 1"),
  };
}

/* ------------------------- Generic admin resources ------------------------- */

function toSqlValue(kind: "text" | "number" | "bool", value: unknown): SQLInputValue {
  if (kind === "bool") return value ? 1 : 0;
  if (kind === "number") return Number(value);
  return String(value ?? "");
}

function fromRow(resource: ResourceName, row: Row): AdminRow {
  const out: AdminRow = { id: Number(row.id) };
  for (const def of columnsFor(RESOURCES[resource])) {
    const raw = row[def.column];
    out[def.column] = def.kind === "bool" ? Boolean(raw) : def.kind === "number" ? Number(raw) : String(raw ?? "");
  }
  return out;
}

export function adminList(resource: ResourceName): AdminRow[] {
  const def = RESOURCES[resource];
  const rows = getDb().prepare(`SELECT * FROM ${def.table} ORDER BY sort_order, id`).all() as Row[];
  return rows.map((row) => fromRow(resource, row));
}

export function adminCreate(resource: ResourceName, data: Row): AdminRow {
  const def = RESOURCES[resource];
  const columns = columnsFor(def);
  const names = columns.map((c) => c.column);
  const sql = `INSERT INTO ${def.table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`;
  const result = getDb()
    .prepare(sql)
    .run(...columns.map((c) => toSqlValue(c.kind, data[c.column])));
  const created = getDb().prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(result.lastInsertRowid) as Row;
  return fromRow(resource, created);
}

export function adminUpdate(resource: ResourceName, id: number, data: Row): AdminRow | null {
  const def = RESOURCES[resource];
  const columns = columnsFor(def);
  const sql = `UPDATE ${def.table} SET ${columns.map((c) => `${c.column} = ?`).join(", ")} WHERE id = ?`;
  const result = getDb()
    .prepare(sql)
    .run(...columns.map((c) => toSqlValue(c.kind, data[c.column])), id);
  if (Number(result.changes) === 0) return null;
  const updated = getDb().prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(id) as Row;
  return fromRow(resource, updated);
}

export function adminDelete(resource: ResourceName, id: number): boolean {
  const def = RESOURCES[resource];
  return Number(getDb().prepare(`DELETE FROM ${def.table} WHERE id = ?`).run(id).changes) > 0;
}

/* --------------------------------- Admins ---------------------------------- */

export function adminExists(username: string): boolean {
  return Boolean(getDb().prepare("SELECT 1 FROM admins WHERE username = ?").get(username));
}

export function findAdminHash(username: string): string | null {
  const row = getDb().prepare("SELECT password_hash FROM admins WHERE username = ?").get(username) as
    | { password_hash: string }
    | undefined;
  return row?.password_hash ?? null;
}
