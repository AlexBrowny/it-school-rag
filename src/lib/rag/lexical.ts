/**
 * Lightweight multilingual BM25 used (a) as the always-available retriever and (b) fused with
 * embedding search when Gemini embeddings are available. No dependencies, no I/O.
 */

const STOPWORDS = new Set(
  [
    // ru
    "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то", "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за", "бы", "по", "только", "ее", "мне", "было", "вот", "от", "меня", "еще", "нет", "о", "из", "ему", "теперь", "когда", "даже", "ну", "ли", "если", "уже", "или", "ни", "быть", "был", "него", "до", "вас", "нибудь", "опять", "уж", "вам", "ведь", "там", "потом", "себя", "ничего", "ей", "может", "они", "тут", "где", "есть", "надо", "ней", "для", "мы", "тебя", "их", "чем", "была", "сам", "чтоб", "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет", "ж", "тогда", "кто", "этот", "того", "потому", "этого", "какой", "совсем", "ним", "здесь", "этом", "один", "почти", "мой", "тем", "чтобы", "нее", "кажется", "сейчас", "были", "куда", "зачем", "всех", "никогда", "можно", "при", "наконец", "два", "об", "другой", "хоть", "после", "над", "больше", "тот", "через", "эти", "нас", "про", "всего", "них", "какая", "много", "разве", "три", "эту", "моя", "впрочем", "хорошо", "свою", "этой", "перед", "иногда", "лучше", "чуть", "том", "нельзя", "такой", "им", "более", "всегда", "конечно", "всю", "между", "ли", "ваш", "ваша", "нужно", "хочу", "подскажите", "пожалуйста", "расскажите", "скажите",
    // en
    "the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "and", "or", "in", "on", "at", "for", "with", "do", "does", "did", "i", "you", "we", "it", "my", "your", "can", "how", "what", "which", "when", "where", "much", "many", "me", "please", "about", "this", "that", "have", "has", "there", "any", "tell",
    // uz
    "va", "bu", "bilan", "uchun", "men", "siz", "biz", "bor", "yoq", "mi", "nima", "qanday", "qaysi", "qachon", "qayerda", "haqida", "iltimos", "ham", "bir", "u", "shu",
  ].map((word) => word.replace(/ё/g, "е")),
);

/** Cross-language hints: a term the user may type → the Russian terms used in the documents. */
const SYNONYMS: Record<string, string[]> = {
  // price
  much: ["цена", "стоимость"], price: ["цена", "стоимость"], cost: ["цена", "стоимость"], prices: ["цена", "стоимость"], fee: ["цена", "стоимость"],
  narx: ["цена", "стоимость"], narxi: ["цена", "стоимость"], qancha: ["цена", "стоимость"], "so'm": ["сум"], som: ["сум"],
  сколько: ["цена", "стоимость"], стоит: ["цена", "стоимость"], стоимость: ["цена"], почем: ["цена"], дорого: ["цена"], "сумах": ["сум"],
  // installment / discount
  installment: ["рассрочка"], installments: ["рассрочка"], "bo'lib": ["рассрочка"], bolib: ["рассрочка"], muddatli: ["рассрочка"],
  discount: ["скидка"], chegirma: ["скидка"],
  // payment
  pay: ["оплата"], payment: ["оплата"], paying: ["оплата"], "to'lov": ["оплата"], tolov: ["оплата"], платить: ["оплата"], заплатить: ["оплата"], платеж: ["оплата"], card: ["оплата", "карта"], click: ["оплата"], payme: ["оплата"],
  // refund / cancel / transfer
  refund: ["возврат"], qaytarish: ["возврат"], деньги: ["оплата", "возврат"], cancel: ["отмена"], bekor: ["отмена"], reschedule: ["перенос"], miss: ["пропуск", "отмена"], skip: ["пропуск"],
  // schedule / hours
  schedule: ["график", "расписание"], hours: ["график", "часы", "работы"], open: ["график", "работы"], opening: ["график", "работы"], jadval: ["график"], vaqti: ["график", "часы"], ish: ["работы"], расписание: ["график"], работаете: ["график", "работы"], работает: ["график", "работы"], режим: ["график"],
  // location / contacts
  связи: ["контакты", "телефон", "telegram"], связь: ["контакты", "телефон", "telegram"], связаться: ["контакты", "телефон", "telegram"], написать: ["контакты", "telegram"], aloqa: ["контакты", "телефон"],
  address: ["адрес"], where: ["адрес"], location: ["адрес"], manzil: ["адрес"], адреса: ["адрес"], phone: ["телефон"], call: ["телефон"], telefon: ["телефон"], contact: ["контакты", "телефон"], contacts: ["контакты", "телефон"], telegram: ["telegram"], instagram: ["instagram"], номер: ["телефон"], позвонить: ["телефон"],
  // people / courses
  teacher: ["преподаватель"], teachers: ["преподаватель"], mentor: ["преподаватель", "ментор"], ustoz: ["преподаватель"], "o'qituvchi": ["преподаватель"], oqituvchi: ["преподаватель"], преподаватели: ["преподаватель"], учитель: ["преподаватель"],
  course: ["курс"], courses: ["курс"], kurs: ["курс"], kurslar: ["курс"], program: ["программа", "курс"], programme: ["программа", "курс"], duration: ["длительность"], months: ["месяц"], month: ["месяц"],
  // enrolment / trial
  enroll: ["запись", "записаться"], register: ["запись", "записаться"], registration: ["запись"], signup: ["запись"], yozilish: ["запись", "записаться"], "ro'yxatdan": ["запись"], book: ["бронирование", "запись"], booking: ["бронирование"], reserve: ["бронирование"], trial: ["пробное"], free: ["бесплатно", "пробное"], sinov: ["пробное"], bepul: ["бесплатно"],
  // preparation
  bring: ["взять", "подготовка"], laptop: ["ноутбук"], noutbuk: ["ноутбук"], prepare: ["подготовка"], need: ["нужен"], requirements: ["подготовка", "нужны"], certificate: ["сертификат"], sertifikat: ["сертификат"], job: ["трудоустройство"], employment: ["трудоустройство"], work: ["трудоустройство"], ish_topish: ["трудоустройство"], guarantee: ["гарантия", "качество"], quality: ["качество"],
  // days
  monday: ["понедельник"], tuesday: ["вторник"], wednesday: ["среда"], thursday: ["четверг"], friday: ["пятница"], saturday: ["суббота"], sunday: ["воскресенье"],
  dushanba: ["понедельник"], seshanba: ["вторник"], chorshanba: ["среда"], payshanba: ["четверг"], juma: ["пятница"], shanba: ["суббота"], yakshanba: ["воскресенье"],
  // subjects (Latin ↔ Cyrillic names used in the docs)
  kiberxavfsizlik: ["кибербезопасность"], xavfsizlik: ["кибербезопасность"], dasturchi: ["разработчик"], tahlilchi: ["аналитик"], dizayner: ["дизайнер"], "o'yin": ["игр", "gamedev"], oyin: ["игр", "gamedev"], sinovchi: ["qa", "тестировщик"],
  designer: ["дизайнер", "ui/ux"], design: ["дизайнер", "ui/ux"], tester: ["qa", "тестировщик"], testing: ["qa", "тестирование"], games: ["gamedev", "игр"], game: ["gamedev", "игр"], security: ["кибербезопасность"], cybersecurity: ["кибербезопасность"], data: ["аналитик", "data"], analyst: ["аналитик"], manager: ["manager", "менеджер"], cloud: ["cloud", "облачные"], mobile: ["мобильная", "mobile"], ai: ["ai"],
};

const CYRILLIC_ENDINGS = /(ами|ями|ого|его|ому|ему|ыми|ими|ов|ев|ей|ом|ем|ам|ям|ах|ях|ою|ею|ия|ие|ий|ый|ой|ая|яя|ое|ее|ые|ую|юю|ть|ся|ка|ку|ки|а|я|у|ю|е|о|ы|и|ь|й)$/;

function normalizeToken(raw: string): string {
  return raw.toLowerCase().replace(/ё/g, "е");
}

function stem(token: string): string {
  let word = token;
  if (/[а-я]/.test(word) && word.length > 4) word = word.replace(CYRILLIC_ENDINGS, "");
  return word.length > 6 ? word.slice(0, 6) : word;
}

/** Splits into normalised, stemmed tokens; keeps things like "ui/ux" as separate parts. */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu)) {
    const token = normalizeToken(match[0]).replace(/['’]/g, "'");
    if (STOPWORDS.has(token)) continue;
    if (token.length < 2 && !/\d/.test(token)) continue;
    out.push(stem(token));
  }
  return out;
}

/** Query tokens plus cross-language synonyms (EN/UZ/colloquial RU → document vocabulary). */
export function queryTokens(query: string): string[] {
  const tokens = tokenize(query);
  const extra: string[] = [];
  for (const match of query.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu)) {
    const raw = normalizeToken(match[0]).replace(/’/g, "'");
    for (const synonym of SYNONYMS[raw] ?? []) extra.push(...tokenize(synonym));
  }
  return [...tokens, ...extra];
}

export interface LexicalDoc {
  id: string;
  /** Searchable text. Repeat important fields (headings) to up-weight them. */
  text: string;
}

export interface ScoredId {
  id: string;
  score: number;
}

const K1 = 1.4;
const B = 0.75;

export class Bm25Index {
  private readonly docs: { id: string; tf: Map<string, number>; length: number }[];
  private readonly df = new Map<string, number>();
  private readonly avgLength: number;

  constructor(docs: readonly LexicalDoc[]) {
    this.docs = docs.map((doc) => {
      const tf = new Map<string, number>();
      const tokens = tokenize(doc.text);
      for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
      for (const token of tf.keys()) this.df.set(token, (this.df.get(token) ?? 0) + 1);
      return { id: doc.id, tf, length: tokens.length };
    });
    this.avgLength = this.docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, this.docs.length);
  }

  search(query: string, limit = 10): ScoredId[] {
    const terms = queryTokens(query);
    if (terms.length === 0) return [];
    const n = this.docs.length;
    const scored: ScoredId[] = [];
    for (const doc of this.docs) {
      let score = 0;
      for (const term of terms) {
        const tf = doc.tf.get(term);
        if (!tf) continue;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / this.avgLength)));
      }
      if (score > 0) scored.push({ id: doc.id, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
