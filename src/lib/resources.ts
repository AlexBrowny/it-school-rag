/**
 * Single source of truth for admin-managed content.
 * Used by the server (SQL columns + zod validation) and by the admin UI (form fields).
 * Contains no server-only imports so it is safe to import from client components.
 */
import { PROFESSION_KEYS } from "@/config/professions";

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "bool"
  | "select"
  | "localized"
  | "localizedTextarea";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly FieldOption[];
  required?: boolean;
  max?: number;
  min?: number;
  hint?: string;
  /** Show as a column in the admin table. */
  list?: boolean;
}

export type AdminRow = { id: number } & Record<string, string | number | boolean>;

export type ResourceName = "courses" | "projects" | "reviews";

export interface ResourceDef {
  name: ResourceName;
  table: string;
  title: string;
  singular: string;
  /** Column used as the row title in admin lists. */
  titleField: string;
  boolFlag: { key: string; label: string };
  fields: readonly FieldDef[];
}

const PROFESSION_LABELS: Record<(typeof PROFESSION_KEYS)[number], string> = {
  frontend: "Frontend",
  backend: "Backend",
  mobile: "Mobile",
  uiux: "UI/UX",
  data: "Data",
  ai: "AI / ML",
  qa: "QA",
  devops: "DevOps",
  security: "Кибербезопасность",
  gamedev: "GameDev",
  pm: "Product / PM",
  cloud: "Cloud",
};

const professionOptions: FieldOption[] = PROFESSION_KEYS.map((key) => ({ value: key, label: PROFESSION_LABELS[key] }));

export const COURSE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const COURSE_FORMATS = ["online", "offline", "hybrid"] as const;

export const RESOURCES: Record<ResourceName, ResourceDef> = {
  courses: {
    name: "courses",
    table: "courses",
    title: "Курсы",
    singular: "курс",
    titleField: "title_ru",
    boolFlag: { key: "published", label: "Опубликован" },
    fields: [
      { key: "title", label: "Название", kind: "localized", required: true, max: 120, list: true },
      { key: "summary", label: "Краткое описание", kind: "localizedTextarea", required: true, max: 400 },
      {
        key: "program",
        label: "Программа (по одному пункту в строке)",
        kind: "localizedTextarea",
        max: 2000,
      },
      { key: "category", label: "Направление", kind: "select", options: professionOptions, required: true, list: true },
      {
        key: "level",
        label: "Уровень",
        kind: "select",
        required: true,
        options: [
          { value: "beginner", label: "С нуля" },
          { value: "intermediate", label: "Средний" },
          { value: "advanced", label: "Продвинутый" },
        ],
        list: true,
      },
      {
        key: "format",
        label: "Формат",
        kind: "select",
        required: true,
        options: [
          { value: "online", label: "Онлайн" },
          { value: "offline", label: "Офлайн" },
          { value: "hybrid", label: "Смешанный" },
        ],
      },
      { key: "duration_months", label: "Длительность (мес.)", kind: "number", min: 1, max: 36, required: true },
      { key: "price", label: "Цена в месяц", kind: "number", min: 0, max: 100000, required: true, list: true },
      { key: "sort_order", label: "Порядок", kind: "number", min: 0, max: 9999 },
      { key: "published", label: "Опубликован", kind: "bool" },
    ],
  },
  projects: {
    name: "projects",
    table: "projects",
    title: "Проекты учеников",
    singular: "проект",
    titleField: "title_ru",
    boolFlag: { key: "published", label: "Опубликован" },
    fields: [
      { key: "title", label: "Название", kind: "localized", required: true, max: 120, list: true },
      { key: "description", label: "Описание", kind: "localizedTextarea", required: true, max: 600 },
      { key: "author", label: "Автор", kind: "text", required: true, max: 80, list: true },
      { key: "category", label: "Направление", kind: "select", options: professionOptions, required: true },
      { key: "tags", label: "Технологии (через запятую)", kind: "text", max: 200 },
      { key: "demo_url", label: "Ссылка на демо", kind: "text", max: 300 },
      { key: "repo_url", label: "Ссылка на код", kind: "text", max: 300 },
      {
        key: "accent",
        label: "Цвет обложки",
        kind: "select",
        required: true,
        options: [
          { value: "0", label: "Синий" },
          { value: "1", label: "Фиолетовый" },
          { value: "2", label: "Розовый" },
          { value: "3", label: "Оранжевый" },
          { value: "4", label: "Зелёный" },
          { value: "5", label: "Бирюзовый" },
        ],
      },
      { key: "sort_order", label: "Порядок", kind: "number", min: 0, max: 9999 },
      { key: "published", label: "Опубликован", kind: "bool" },
    ],
  },
  reviews: {
    name: "reviews",
    table: "reviews",
    title: "Отзывы",
    singular: "отзыв",
    titleField: "author",
    boolFlag: { key: "approved", label: "Одобрен" },
    fields: [
      { key: "author", label: "Имя", kind: "text", required: true, max: 80, list: true },
      { key: "role", label: "Роль / курс", kind: "localized", required: true, max: 120 },
      { key: "text", label: "Текст отзыва", kind: "localizedTextarea", required: true, max: 800 },
      { key: "rating", label: "Оценка (1–5)", kind: "number", min: 1, max: 5, required: true, list: true },
      { key: "sort_order", label: "Порядок", kind: "number", min: 0, max: 9999 },
      { key: "approved", label: "Одобрен", kind: "bool" },
    ],
  },
};

export function isResourceName(value: string): value is ResourceName {
  return Object.hasOwn(RESOURCES, value);
}

export const LANG_SUFFIXES = ["ru", "en", "uz"] as const;

export interface ColumnDef {
  column: string;
  kind: "text" | "number" | "bool";
  field: FieldDef;
  /** Only the Russian variant is required for localized fields. */
  required: boolean;
}

/** Expands localized fields into their per-language SQL columns. */
export function columnsFor(resource: ResourceDef): ColumnDef[] {
  return resource.fields.flatMap((field): ColumnDef[] => {
    if (field.kind === "localized" || field.kind === "localizedTextarea") {
      return LANG_SUFFIXES.map((lang) => ({
        column: `${field.key}_${lang}`,
        kind: "text" as const,
        field,
        required: Boolean(field.required) && lang === "ru",
      }));
    }
    const kind = field.kind === "number" ? "number" : field.kind === "bool" ? "bool" : "text";
    return [{ column: field.key, kind, field, required: Boolean(field.required) }];
  });
}
