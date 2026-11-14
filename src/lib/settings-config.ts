/** Site settings editable in the admin panel. Safe to import from client components. */
export interface SettingField {
  key: string;
  label: string;
  group: "Школа" | "Контакты" | "Адрес и график" | "Цифры на сайте";
  localized?: boolean;
  type?: "text" | "number";
  max?: number;
}

export const SETTING_FIELDS: readonly SettingField[] = [
  { key: "school_name", label: "Название школы", group: "Школа", max: 60 },
  { key: "currency", label: "Символ валюты (для цен)", group: "Школа", max: 4 },
  { key: "phone", label: "Телефон", group: "Контакты", max: 40 },
  { key: "email", label: "Email", group: "Контакты", max: 120 },
  { key: "telegram", label: "Telegram (ссылка)", group: "Контакты", max: 200 },
  { key: "instagram", label: "Instagram (ссылка)", group: "Контакты", max: 200 },
  { key: "youtube", label: "YouTube (ссылка)", group: "Контакты", max: 200 },
  { key: "address", label: "Адрес", group: "Адрес и график", localized: true, max: 200 },
  { key: "hours", label: "График работы", group: "Адрес и график", localized: true, max: 120 },
  { key: "stat_students", label: "Выпускников и студентов", group: "Цифры на сайте", type: "number", max: 6 },
  { key: "stat_employed", label: "Трудоустроены, %", group: "Цифры на сайте", type: "number", max: 3 },
  { key: "stat_years", label: "Лет на рынке", group: "Цифры на сайте", type: "number", max: 3 },
  { key: "stat_mentors", label: "Менторов-практиков", group: "Цифры на сайте", type: "number", max: 4 },
];

export const SETTING_KEYS: readonly string[] = SETTING_FIELDS.flatMap((field) =>
  field.localized ? ["ru", "en", "uz"].map((l) => `${field.key}_${l}`) : [field.key],
);
