import { z } from "zod";
import { columnsFor, RESOURCES, type ColumnDef, type ResourceName } from "@/lib/resources";
import { isValidContact } from "@/lib/contact";
import { SETTING_FIELDS } from "@/lib/settings-config";
import { safeHttpUrl } from "@/lib/url";

export const LEAD_STATUSES = ["new", "contacted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

function columnSchema(def: ColumnDef): z.ZodType {
  const { field } = def;
  if (def.kind === "bool") return z.boolean();
  if (def.kind === "number") {
    let schema = z.coerce.number().int();
    if (field.min !== undefined) schema = schema.min(field.min);
    if (field.max !== undefined) schema = schema.max(field.max);
    return def.required ? schema : schema.default(0);
  }
  if (field.kind === "select" && field.options) {
    const values = field.options.map((option) => option.value);
    return z.enum(values as [string, ...string[]]);
  }
  let schema = z.string().trim().max(field.max ?? 2000);
  if (def.required) schema = schema.min(1);
  return def.required ? schema : schema.default("");
}

/** Builds a zod schema from the shared resource config. Unknown keys are stripped. */
export function buildResourceSchema(name: ResourceName) {
  const shape: Record<string, z.ZodType> = {};
  for (const def of columnsFor(RESOURCES[name])) shape[def.column] = columnSchema(def);
  return z.object(shape);
}

const urlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === "" || /^https?:\/\//i.test(value), "URL must start with http(s)://");

export const projectUrlsSchema = z.object({ demo_url: urlOrEmpty, repo_url: urlOrEmpty });

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z
    .string()
    .trim()
    .min(5)
    .max(120)
    .refine(isValidContact, "contact"),
  courseId: z.coerce.number().int().positive().nullable().optional(),
  message: z.string().trim().max(1000).default(""),
  locale: z.enum(["ru", "en", "uz"]).default("ru"),
  /** Honeypot: real users never fill this in. */
  website: z.string().max(0).optional(),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const leadStatusSchema = z.object({ status: z.enum(LEAD_STATUSES) });

const URL_SETTINGS = new Set(["telegram", "instagram", "youtube"]);
const NUMERIC_SETTINGS = new Set(SETTING_FIELDS.filter((f) => f.type === "number").map((f) => f.key));
const SETTING_LIMITS: Record<string, number> = {};
for (const field of SETTING_FIELDS) {
  const keys = field.localized ? ["ru", "en", "uz"].map((l) => `${field.key}_${l}`) : [field.key];
  for (const key of keys) SETTING_LIMITS[key] = field.max ?? 300;
}

/** Validates each known setting against its field definition; unknown keys are dropped. */
export const settingsSchema = z
  .record(z.string(), z.string().max(300))
  .transform((input) =>
    Object.fromEntries(Object.entries(input).filter(([key]) => key in SETTING_LIMITS).map(([k, v]) => [k, v.trim()])),
  )
  .superRefine((values, ctx) => {
    for (const [key, value] of Object.entries(values)) {
      const fail = (message: string) => ctx.addIssue({ code: "custom", path: [key], message });
      if (value.length > SETTING_LIMITS[key]) fail(`Не длиннее ${SETTING_LIMITS[key]} символов`);
      else if (NUMERIC_SETTINGS.has(key) && !/^\d*$/.test(value)) fail("Только цифры");
      else if (URL_SETTINGS.has(key) && value !== "" && !safeHttpUrl(value)) fail("Ссылка должна начинаться с http:// или https://");
      else if (key === "email" && value !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail("Некорректный email");
    }
  });
