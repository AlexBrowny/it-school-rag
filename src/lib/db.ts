import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { SEED_COURSES, SEED_PROJECTS, SEED_REVIEWS, SEED_SETTINGS } from "@/lib/seed-data";

const DB_FILE = process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "school.db");
const BCRYPT_ROUNDS = 12;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  format TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 6,
  price INTEGER NOT NULL DEFAULT 0,
  title_ru TEXT NOT NULL DEFAULT '', title_en TEXT NOT NULL DEFAULT '', title_uz TEXT NOT NULL DEFAULT '',
  summary_ru TEXT NOT NULL DEFAULT '', summary_en TEXT NOT NULL DEFAULT '', summary_uz TEXT NOT NULL DEFAULT '',
  program_ru TEXT NOT NULL DEFAULT '', program_en TEXT NOT NULL DEFAULT '', program_uz TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  demo_url TEXT NOT NULL DEFAULT '',
  repo_url TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '0',
  title_ru TEXT NOT NULL DEFAULT '', title_en TEXT NOT NULL DEFAULT '', title_uz TEXT NOT NULL DEFAULT '',
  description_ru TEXT NOT NULL DEFAULT '', description_en TEXT NOT NULL DEFAULT '', description_uz TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  role_ru TEXT NOT NULL DEFAULT '', role_en TEXT NOT NULL DEFAULT '', role_uz TEXT NOT NULL DEFAULT '',
  text_ru TEXT NOT NULL DEFAULT '', text_en TEXT NOT NULL DEFAULT '', text_uz TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  course_id INTEGER,
  message TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'ru',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);
`;

function seed(db: DatabaseSync): void {
  const alreadySeeded = db.prepare("SELECT value FROM settings WHERE key = 'seeded'").get();
  if (alreadySeeded) return;

  db.exec("BEGIN");
  try {
    const insertCourse = db.prepare(
      `INSERT INTO courses (category, level, format, duration_months, price,
        title_ru, title_en, title_uz, summary_ru, summary_en, summary_uz,
        program_ru, program_en, program_uz, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    SEED_COURSES.forEach((course, index) => {
      const program = (lang: 0 | 1 | 2): string => course.program.map((item) => item[lang]).join("\n");
      insertCourse.run(
        course.category, course.level, course.format, course.months, course.price,
        course.title[0], course.title[1], course.title[2],
        course.summary[0], course.summary[1], course.summary[2],
        program(0), program(1), program(2), index,
      );
    });

    const insertProject = db.prepare(
      `INSERT INTO projects (category, author, tags, accent,
        title_ru, title_en, title_uz, description_ru, description_en, description_uz, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    SEED_PROJECTS.forEach((project, index) => {
      insertProject.run(
        project.category, project.author, project.tags, String(project.accent),
        project.title[0], project.title[1], project.title[2],
        project.description[0], project.description[1], project.description[2], index,
      );
    });

    const insertReview = db.prepare(
      `INSERT INTO reviews (author, rating, role_ru, role_en, role_uz, text_ru, text_en, text_uz, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    SEED_REVIEWS.forEach((review, index) => {
      insertReview.run(
        review.author, review.rating,
        review.role[0], review.role[1], review.role[2],
        review.text[0], review.text[1], review.text[2], index,
      );
    });

    const insertSetting = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(SEED_SETTINGS)) insertSetting.run(key, value);
    insertSetting.run("seeded", "1");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Creates the first admin from env vars when no admin exists yet. */
function ensureAdmin(db: DatabaseSync): void {
  const row = db.prepare("SELECT COUNT(*) AS n FROM admins").get() as { n: number };
  if (row.n > 0) return;

  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_USER and ADMIN_PASSWORD must be set to create the first admin account.");
    }
    console.warn("[orbit] No admin account exists and ADMIN_USER/ADMIN_PASSWORD are not set: admin login is disabled.");
    return;
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH || /change-me|changeme|password123/i.test(password)) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters and not a placeholder.`);
  }
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, hash);
}

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  seed(db);
  ensureAdmin(db);
  return db;
}

const globalForDb = globalThis as unknown as { __schoolDb?: DatabaseSync };

/** Lazily opened singleton; survives HMR in dev. */
export function getDb(): DatabaseSync {
  if (!globalForDb.__schoolDb) globalForDb.__schoolDb = open();
  return globalForDb.__schoolDb;
}
