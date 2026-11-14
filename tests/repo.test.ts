import { beforeAll, describe, expect, it } from "vitest";
import { useTempDatabase } from "./helpers";

type Repo = typeof import("@/lib/repo");
let repo: Repo;

beforeAll(async () => {
  useTempDatabase();
  repo = await import("@/lib/repo");
});

describe("seeded content", () => {
  it("exposes published courses, projects and approved reviews", () => {
    expect(repo.getPublicCourses("ru").length).toBeGreaterThanOrEqual(12);
    expect(repo.getPublicProjects("en").length).toBeGreaterThan(0);
    expect(repo.getPublicReviews("uz").length).toBeGreaterThan(0);
  });

  it("localises course text and splits the programme into items", () => {
    const [ru] = repo.getPublicCourses("ru");
    const [en] = repo.getPublicCourses("en");
    const [uz] = repo.getPublicCourses("uz");
    expect(new Set([ru.title, en.title, uz.title]).size).toBe(3);
    expect(ru.program.length).toBeGreaterThan(1);
  });

  it("stores the default settings", () => {
    const settings = repo.getSettings();
    expect(settings.school_name).toBe("Orbit IT School");
    expect(Number(settings.stat_students)).toBeGreaterThan(0);
  });
});

describe("admin CRUD", () => {
  const payload = {
    title_ru: "Тестовый курс", title_en: "Test course", title_uz: "",
    summary_ru: "Описание", summary_en: "Summary", summary_uz: "",
    program_ru: "Один\nДва", program_en: "", program_uz: "",
    category: "qa", level: "beginner", format: "online",
    duration_months: 3, price: 50, sort_order: 99, published: true,
  };

  it("creates, updates, hides and deletes a course", () => {
    const created = repo.adminCreate("courses", payload);
    expect(created.id).toBeGreaterThan(0);
    expect(repo.getPublicCourses("en").some((c) => c.title === "Test course")).toBe(true);

    const updated = repo.adminUpdate("courses", Number(created.id), { ...payload, title_en: "Renamed", published: false });
    expect(updated?.title_en).toBe("Renamed");
    expect(repo.getPublicCourses("en").some((c) => c.id === created.id)).toBe(false);

    expect(repo.adminDelete("courses", Number(created.id))).toBe(true);
    expect(repo.adminDelete("courses", Number(created.id))).toBe(false);
  });

  it("returns null when updating a missing row", () => {
    expect(repo.adminUpdate("courses", 987654, payload)).toBeNull();
  });

  it("only publishes approved reviews", () => {
    const review = repo.adminCreate("reviews", {
      author: "Tester", rating: 5, role_ru: "Выпускник", role_en: "", role_uz: "",
      text_ru: "Отлично", text_en: "", text_uz: "", sort_order: 50, approved: false,
    });
    expect(repo.getPublicReviews("ru").some((r) => r.id === review.id)).toBe(false);
    repo.adminUpdate("reviews", Number(review.id), { ...review, approved: true });
    expect(repo.getPublicReviews("ru").some((r) => r.id === review.id)).toBe(true);
  });

  it("stores hostile text as data, not SQL", () => {
    const evil = "'); DROP TABLE courses; --";
    const created = repo.adminCreate("courses", { ...payload, title_ru: evil });
    expect(repo.getPublicCourses("ru").some((c) => c.title === evil)).toBe(true);
    expect(repo.getPublicCourses("ru").length).toBeGreaterThan(5);
    repo.adminDelete("courses", Number(created.id));
  });
});

describe("leads", () => {
  it("creates a lead linked to a course and tracks its status", () => {
    const course = repo.getPublicCourses("ru")[0];
    const id = repo.createLead({ name: "Алишер", contact: "+998901234567", courseId: course.id, message: "Привет", locale: "ru" });
    const lead = repo.listLeads().find((l) => l.id === id);
    expect(lead?.status).toBe("new");
    expect(lead?.courseTitle).toBe(course.title);

    expect(repo.updateLeadStatus(id, "contacted")).toBe(true);
    expect(repo.listLeads().find((l) => l.id === id)?.status).toBe("contacted");
    expect(repo.getDashboardStats().leadsTotal).toBeGreaterThanOrEqual(1);

    expect(repo.deleteLead(id)).toBe(true);
    expect(repo.deleteLead(id)).toBe(false);
  });
});

describe("settings", () => {
  it("upserts values", () => {
    repo.saveSettings({ phone: "+998 00 000 00 00", brand_new_key: "x" });
    expect(repo.getSettings().phone).toBe("+998 00 000 00 00");
    expect(repo.getSettings().brand_new_key).toBe("x");
  });
});

describe("admin bootstrap", () => {
  it("creates the first admin from env and verifies the password", async () => {
    const { authenticate } = await import("@/lib/auth");
    expect(await authenticate("tester", "correct-horse-battery")).toBe(true);
    expect(await authenticate("tester", "wrong")).toBe(false);
    expect(await authenticate("nobody", "correct-horse-battery")).toBe(false);
  });
});
