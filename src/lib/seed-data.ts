import type { ProfessionKey } from "@/config/professions";

type L = readonly [ru: string, en: string, uz: string];

export interface SeedCourse {
  category: ProfessionKey;
  level: "beginner" | "intermediate" | "advanced";
  format: "online" | "offline" | "hybrid";
  months: number;
  price: number;
  title: L;
  summary: L;
  program: readonly [L, L, L, L];
}

export const SEED_COURSES: readonly SeedCourse[] = [
  {
    category: "frontend",
    level: "beginner",
    format: "hybrid",
    months: 6,
    price: 120,
    title: ["Frontend-разработчик", "Frontend Developer", "Frontend dasturchi"],
    summary: [
      "Научитесь верстать и создавать интерактивные интерфейсы на React и Next.js.",
      "Learn to build fast, interactive interfaces with React and Next.js.",
      "React va Next.js yordamida tez va interaktiv interfeyslar yaratishni o‘rganing.",
    ],
    program: [
      ["HTML, CSS и адаптивная вёрстка", "HTML, CSS and responsive layout", "HTML, CSS va adaptiv maket"],
      ["JavaScript и TypeScript", "JavaScript and TypeScript", "JavaScript va TypeScript"],
      ["React, Next.js и состояние", "React, Next.js and state", "React, Next.js va holat boshqaruvi"],
      ["Командный проект и портфолио", "Team project and portfolio", "Jamoaviy loyiha va portfolio"],
    ],
  },
  {
    category: "backend",
    level: "beginner",
    format: "online",
    months: 7,
    price: 130,
    title: ["Backend-разработчик (Node.js)", "Backend Developer (Node.js)", "Backend dasturchi (Node.js)"],
    summary: [
      "Проектируйте API, базы данных и серверную логику для реальных продуктов.",
      "Design APIs, databases and server logic for real products.",
      "Haqiqiy mahsulotlar uchun API, ma’lumotlar bazasi va server mantiqini yarating.",
    ],
    program: [
      ["Основы программирования и Git", "Programming basics and Git", "Dasturlash asoslari va Git"],
      ["Node.js, REST и аутентификация", "Node.js, REST and authentication", "Node.js, REST va autentifikatsiya"],
      ["SQL, PostgreSQL и кэширование", "SQL, PostgreSQL and caching", "SQL, PostgreSQL va keshlash"],
      ["Docker и деплой проекта", "Docker and project deployment", "Docker va loyihani joylashtirish"],
    ],
  },
  {
    category: "mobile",
    level: "intermediate",
    format: "hybrid",
    months: 7,
    price: 140,
    title: ["Мобильная разработка", "Mobile Development", "Mobil ilovalar yaratish"],
    summary: [
      "Создавайте кроссплатформенные приложения для iOS и Android на React Native.",
      "Build cross-platform iOS and Android apps with React Native.",
      "React Native yordamida iOS va Android uchun ilovalar yarating.",
    ],
    program: [
      ["JavaScript и основы React", "JavaScript and React basics", "JavaScript va React asoslari"],
      ["React Native и навигация", "React Native and navigation", "React Native va navigatsiya"],
      ["API, хранилище и push-уведомления", "APIs, storage and push notifications", "API, saqlash va push-xabarlar"],
      ["Публикация в App Store и Google Play", "Publishing to the App Store and Google Play", "App Store va Google Play’da e’lon qilish"],
    ],
  },
  {
    category: "uiux",
    level: "beginner",
    format: "online",
    months: 5,
    price: 110,
    title: ["UI/UX-дизайнер", "UI/UX Designer", "UI/UX dizayner"],
    summary: [
      "От исследования пользователей до готового прототипа в Figma.",
      "From user research to a finished Figma prototype.",
      "Foydalanuvchi tadqiqotidan Figma’dagi tayyor prototipgacha.",
    ],
    program: [
      ["Основы дизайна и композиции", "Design and composition basics", "Dizayn va kompozitsiya asoslari"],
      ["Исследования и пользовательские сценарии", "Research and user flows", "Tadqiqot va foydalanuvchi ssenariylari"],
      ["Figma, дизайн-системы и компоненты", "Figma, design systems and components", "Figma, dizayn tizimlari va komponentlar"],
      ["Кейсы для портфолио", "Portfolio case studies", "Portfolio uchun keyslar"],
    ],
  },
  {
    category: "data",
    level: "intermediate",
    format: "online",
    months: 8,
    price: 150,
    title: ["Аналитик данных", "Data Analyst", "Ma’lumotlar tahlilchisi"],
    summary: [
      "Превращайте данные в решения: SQL, Python, визуализация и BI.",
      "Turn data into decisions with SQL, Python, visualization and BI.",
      "SQL, Python, vizualizatsiya va BI yordamida ma’lumotni qarorga aylantiring.",
    ],
    program: [
      ["Статистика и Excel", "Statistics and Excel", "Statistika va Excel"],
      ["SQL и работа с базами данных", "SQL and working with databases", "SQL va ma’lumotlar bazalari bilan ishlash"],
      ["Python, Pandas и визуализация", "Python, Pandas and visualization", "Python, Pandas va vizualizatsiya"],
      ["BI-дашборды и защита проекта", "BI dashboards and project defence", "BI dashboardlar va loyiha himoyasi"],
    ],
  },
  {
    category: "ai",
    level: "advanced",
    format: "hybrid",
    months: 9,
    price: 180,
    title: ["AI и машинное обучение", "AI & Machine Learning", "AI va mashinali o‘qitish"],
    summary: [
      "Обучайте модели, работайте с LLM и внедряйте AI в продукты.",
      "Train models, work with LLMs and ship AI inside products.",
      "Modellarni o‘rgating, LLM bilan ishlang va AI’ni mahsulotlarga joriy qiling.",
    ],
    program: [
      ["Python и математика для ML", "Python and math for ML", "ML uchun Python va matematika"],
      ["Классический ML и нейросети", "Classical ML and neural networks", "Klassik ML va neyron tarmoqlar"],
      ["LLM, RAG и агенты", "LLMs, RAG and agents", "LLM, RAG va agentlar"],
      ["MLOps и вывод модели в production", "MLOps and shipping models to production", "MLOps va modelni production’ga chiqarish"],
    ],
  },
  {
    category: "qa",
    level: "beginner",
    format: "online",
    months: 4,
    price: 90,
    title: ["QA-инженер", "QA Engineer", "QA muhandis"],
    summary: [
      "Ручное и автоматизированное тестирование: от тест-кейсов до CI.",
      "Manual and automated testing, from test cases to CI.",
      "Qo‘lda va avtomatlashtirilgan testlash: test-keyslardan CI’gacha.",
    ],
    program: [
      ["Теория тестирования и тест-дизайн", "Testing theory and test design", "Testlash nazariyasi va test-dizayn"],
      ["Баг-репорты, Jira и API-тесты", "Bug reports, Jira and API tests", "Bag-hisobotlar, Jira va API testlar"],
      ["Автотесты на Playwright", "Automated tests with Playwright", "Playwright’da avtotestlar"],
      ["CI/CD и итоговый проект", "CI/CD and final project", "CI/CD va yakuniy loyiha"],
    ],
  },
  {
    category: "devops",
    level: "intermediate",
    format: "online",
    months: 6,
    price: 140,
    title: ["DevOps-инженер", "DevOps Engineer", "DevOps muhandis"],
    summary: [
      "Автоматизируйте сборку, доставку и мониторинг сервисов.",
      "Automate building, delivery and monitoring of services.",
      "Xizmatlarni yig‘ish, yetkazish va monitoringini avtomatlashtiring.",
    ],
    program: [
      ["Linux, сети и Bash", "Linux, networking and Bash", "Linux, tarmoq va Bash"],
      ["Docker и Kubernetes", "Docker and Kubernetes", "Docker va Kubernetes"],
      ["CI/CD и Infrastructure as Code", "CI/CD and Infrastructure as Code", "CI/CD va Infrastructure as Code"],
      ["Мониторинг и инциденты", "Monitoring and incidents", "Monitoring va insidentlar"],
    ],
  },
  {
    category: "security",
    level: "advanced",
    format: "offline",
    months: 8,
    price: 170,
    title: ["Кибербезопасность", "Cybersecurity", "Kiberxavfsizlik"],
    summary: [
      "Защита систем, этичный хакинг и расследование инцидентов.",
      "System defence, ethical hacking and incident response.",
      "Tizimlarni himoyalash, etik xakerlik va insidentlarni tekshirish.",
    ],
    program: [
      ["Сети, Linux и основы ИБ", "Networks, Linux and security basics", "Tarmoq, Linux va xavfsizlik asoslari"],
      ["Веб-уязвимости и OWASP", "Web vulnerabilities and OWASP", "Veb zaifliklar va OWASP"],
      ["Пентест и CTF-практика", "Pentesting and CTF practice", "Pentest va CTF amaliyoti"],
      ["SOC, SIEM и реагирование", "SOC, SIEM and response", "SOC, SIEM va javob choralari"],
    ],
  },
  {
    category: "gamedev",
    level: "beginner",
    format: "hybrid",
    months: 9,
    price: 150,
    title: ["Разработчик игр (Unity)", "Game Developer (Unity)", "O‘yin dasturchisi (Unity)"],
    summary: [
      "Создайте и опубликуйте свою первую игру на Unity и C#.",
      "Build and publish your first game with Unity and C#.",
      "Unity va C# yordamida birinchi o‘yiningizni yarating va e’lon qiling.",
    ],
    program: [
      ["C# и основы геймдизайна", "C# and game design basics", "C# va geymdizayn asoslari"],
      ["Unity: физика, анимация, UI", "Unity: physics, animation, UI", "Unity: fizika, animatsiya, UI"],
      ["3D, свет и эффекты", "3D, lighting and effects", "3D, yorug‘lik va effektlar"],
      ["Релиз игры в Steam и на мобильных", "Releasing on Steam and mobile", "Steam va mobil platformalarda chiqarish"],
    ],
  },
  {
    category: "pm",
    level: "intermediate",
    format: "online",
    months: 4,
    price: 100,
    title: ["Product / Project Manager", "Product / Project Manager", "Product / Project menejer"],
    summary: [
      "Управляйте продуктом и командой: от идеи до релиза.",
      "Lead a product and a team from idea to release.",
      "Mahsulot va jamoani g‘oyadan relizgacha boshqaring.",
    ],
    program: [
      ["Продуктовое мышление и метрики", "Product thinking and metrics", "Mahsulotiy fikrlash va metrikalar"],
      ["Scrum, Kanban и планирование", "Scrum, Kanban and planning", "Scrum, Kanban va rejalashtirish"],
      ["Приоритизация и roadmap", "Prioritisation and roadmap", "Ustuvorlik va roadmap"],
      ["Коммуникации и управление рисками", "Communication and risk management", "Kommunikatsiya va risklarni boshqarish"],
    ],
  },
  {
    category: "cloud",
    level: "intermediate",
    format: "online",
    months: 6,
    price: 145,
    title: ["Облачные технологии (AWS)", "Cloud Engineering (AWS)", "Bulut texnologiyalari (AWS)"],
    summary: [
      "Проектируйте масштабируемую инфраструктуру в облаке.",
      "Design scalable infrastructure in the cloud.",
      "Bulutda masshtablanuvchi infratuzilma loyihalang.",
    ],
    program: [
      ["Основы облаков и IAM", "Cloud basics and IAM", "Bulut asoslari va IAM"],
      ["Вычисления, хранилища, сети", "Compute, storage and networking", "Hisoblash, saqlash va tarmoq"],
      ["Serverless и контейнеры", "Serverless and containers", "Serverless va konteynerlar"],
      ["Стоимость, безопасность и сертификация", "Cost, security and certification", "Narx, xavfsizlik va sertifikatlash"],
    ],
  },
];

export interface SeedProject {
  title: L;
  description: L;
  author: string;
  category: ProfessionKey;
  tags: string;
  accent: number;
}

export const SEED_PROJECTS: readonly SeedProject[] = [
  {
    title: ["TaskFlow — доска задач", "TaskFlow — task board", "TaskFlow — vazifalar doskasi"],
    description: [
      "Канбан-доска с командами, drag-and-drop и уведомлениями в реальном времени.",
      "Kanban board with teams, drag-and-drop and real-time notifications.",
      "Jamoalar, drag-and-drop va real vaqt xabarnomalari bilan kanban doska.",
    ],
    author: "Азиз К.",
    category: "frontend",
    tags: "React, TypeScript, WebSocket",
    accent: 0,
  },
  {
    title: ["MedBook — запись к врачу", "MedBook — doctor booking", "MedBook — shifokorga yozilish"],
    description: [
      "Сервис онлайн-записи в клинику с расписанием врачей и напоминаниями.",
      "Online clinic booking with doctor schedules and reminders.",
      "Shifokor jadvali va eslatmalar bilan klinikaga onlayn yozilish xizmati.",
    ],
    author: "Мадина Р.",
    category: "backend",
    tags: "Node.js, PostgreSQL, Docker",
    accent: 1,
  },
  {
    title: ["FitPulse — фитнес-трекер", "FitPulse — fitness tracker", "FitPulse — fitnes treker"],
    description: [
      "Мобильное приложение для тренировок с графиками прогресса и целями.",
      "Mobile workout app with progress charts and goals.",
      "Mashg‘ulotlar, taraqqiyot grafiklari va maqsadlar bilan mobil ilova.",
    ],
    author: "Jasur T.",
    category: "mobile",
    tags: "React Native, Expo, SQLite",
    accent: 4,
  },
  {
    title: ["Bank UX — редизайн приложения", "Bank UX — app redesign", "Bank UX — ilovani qayta dizayn qilish"],
    description: [
      "Исследование и редизайн мобильного банка: +32% конверсии в тестах.",
      "Research and redesign of a mobile bank: +32% conversion in tests.",
      "Mobil bankni tadqiq qilish va qayta dizayni: testlarda konversiya +32%.",
    ],
    author: "Элина С.",
    category: "uiux",
    tags: "Figma, Research, Prototyping",
    accent: 2,
  },
  {
    title: ["SalesLens — аналитика продаж", "SalesLens — sales analytics", "SalesLens — savdo tahlili"],
    description: [
      "Дашборд продаж ритейла с прогнозом спроса на основе Python.",
      "Retail sales dashboard with Python-based demand forecasting.",
      "Python asosidagi talab prognozi bilan chakana savdo dashboardi.",
    ],
    author: "Дилшод А.",
    category: "data",
    tags: "SQL, Python, Power BI",
    accent: 5,
  },
  {
    title: ["StudyBot — AI-помощник", "StudyBot — AI study assistant", "StudyBot — AI o‘quv yordamchisi"],
    description: [
      "Чат-бот на LLM, отвечающий по конспектам курса с источниками.",
      "LLM chatbot that answers from course notes and cites sources.",
      "Kurs konspektlari asosida manbalar bilan javob beruvchi LLM chat-bot.",
    ],
    author: "Камила Н.",
    category: "ai",
    tags: "Python, RAG, FastAPI",
    accent: 3,
  },
];

export interface SeedReview {
  author: string;
  role: L;
  text: L;
  rating: number;
}

export const SEED_REVIEWS: readonly SeedReview[] = [
  {
    author: "Азиз Каримов",
    role: ["Выпускник Frontend, UI-разработчик", "Frontend graduate, UI Developer", "Frontend bitiruvchisi, UI dasturchi"],
    text: [
      "Через 6 месяцев я получил первый оффер. Менторы разбирали каждый мой проект — это и дало результат.",
      "I got my first offer after 6 months. Mentors reviewed every project I made, and that made the difference.",
      "6 oydan keyin birinchi taklifni oldim. Murabbiylar har bir loyihamni tahlil qilishdi — aynan shu natija berdi.",
    ],
    rating: 5,
  },
  {
    author: "Мадина Рахимова",
    role: ["Выпускница Backend, Junior Developer", "Backend graduate, Junior Developer", "Backend bitiruvchisi, Junior dasturchi"],
    text: [
      "Пришла из бухгалтерии без опыта в коде. Программа выстроена так, что не теряешься даже на сложных темах.",
      "I came from accounting with zero coding experience. The programme is built so you never get lost, even on hard topics.",
      "Buxgalteriyadan kodlash tajribasisiz keldim. Dastur shunday tuzilganki, murakkab mavzularda ham adashmaysiz.",
    ],
    rating: 5,
  },
  {
    author: "Jasur Tursunov",
    role: ["Выпускник Mobile, создатель стартапа", "Mobile graduate, startup founder", "Mobil bitiruvchisi, startap asoschisi"],
    text: [
      "Свой стартап запустил ещё во время курса. Сообщество школы помогло найти команду и первых пользователей.",
      "I launched my startup while still studying. The school community helped me find a team and first users.",
      "O‘qish davridayoq startapimni ishga tushirdim. Maktab hamjamiyati jamoa va birinchi foydalanuvchilarni topishga yordam berdi.",
    ],
    rating: 5,
  },
  {
    author: "Элина Смирнова",
    role: ["Выпускница UI/UX, Product Designer", "UI/UX graduate, Product Designer", "UI/UX bitiruvchisi, Product dizayner"],
    text: [
      "Три кейса в портфолио к концу курса и помощь с резюме — на собеседованиях меня уже ждали с вопросами по проектам.",
      "Three case studies in my portfolio by the end and help with my CV; interviewers asked about my projects right away.",
      "Kurs oxirida portfoliomda uchta keys va CV bo‘yicha yordam — suhbatlarda loyihalarim haqida so‘rashdi.",
    ],
    rating: 5,
  },
  {
    author: "Дилшод Алиев",
    role: ["Выпускник Data, Data Analyst", "Data graduate, Data Analyst", "Data bitiruvchisi, Ma’lumotlar tahlilchisi"],
    text: [
      "Сильная практика по SQL и дашбордам. Через два месяца после выпуска уже работал аналитиком в банке.",
      "Strong hands-on SQL and dashboards. Two months after graduating I was working as an analyst at a bank.",
      "SQL va dashboardlar bo‘yicha kuchli amaliyot. Bitirgach ikki oy o‘tmay bankda tahlilchi bo‘lib ishlay boshladim.",
    ],
    rating: 4,
  },
  {
    author: "Камила Назарова",
    role: ["Выпускница AI, ML Engineer", "AI graduate, ML Engineer", "AI bitiruvchisi, ML muhandis"],
    text: [
      "Курс по AI — без воды: от математики до вывода модели в production. Лучшие инвестиции в карьеру.",
      "The AI course has no filler: from the maths to shipping a model to production. Best career investment I made.",
      "AI kursi ortiqcha gapsiz: matematikadan modelni production’ga chiqarishgacha. Karyeramga eng yaxshi investitsiya.",
    ],
    rating: 5,
  },
];

export const SEED_SETTINGS: Readonly<Record<string, string>> = {
  school_name: "Orbit IT School",
  phone: "+998 71 200 00 00",
  email: "hello@orbit-school.example",
  telegram: "https://t.me/orbit_it_school",
  instagram: "https://instagram.com/orbit_it_school",
  youtube: "https://youtube.com/@orbit_it_school",
  address_ru: "Ташкент, ул. Амира Темура, 108, 3 этаж",
  address_en: "108 Amir Temur St., 3rd floor, Tashkent",
  address_uz: "Toshkent sh., Amir Temur ko‘chasi, 108-uy, 3-qavat",
  hours_ru: "Пн–Сб, 09:00–20:00",
  hours_en: "Mon–Sat, 9:00–20:00",
  hours_uz: "Du–Sha, 09:00–20:00",
  stat_students: "3200",
  stat_employed: "87",
  stat_years: "7",
  stat_mentors: "45",
  currency: "$",
};
