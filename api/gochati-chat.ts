import { createClient } from "@supabase/supabase-js";

const femaleNames = [
  "Emma",
  "Sophie",
  "Hannah",
  "Laura",
  "Marie",
  "Julia",
  "Anna",
  "Chloe",
  "Lucia",
  "Elena",
  "Nora",
  "Ida",
  "Freya",
  "Katrin",
  "Isabel",
  "Amelie",
  "Clara",
  "Sara",
  "Nina",
  "Maja",
  "Olivia",
  "Lena",
  "Alice",
  "Ella",
  "Mia",
  "Eva",
];
const maleNames = [
  "Lucas",
  "Daniel",
  "Thomas",
  "Peter",
  "Jonas",
  "Marc",
  "Oliver",
  "Henrik",
  "Felix",
  "Andreas",
  "Mateo",
  "Erik",
  "Liam",
  "Noah",
  "Adrian",
  "Simon",
  "Victor",
  "Pablo",
  "Nils",
  "Kevin",
  "Jack",
  "Leon",
  "Hugo",
  "Max",
  "Sven",
  "Oscar",
];
const countries = [
  "Germany",
  "France",
  "Sweden",
  "Norway",
  "USA",
  "Canada",
  "Italy",
  "Spain",
  "Netherlands",
  "Denmark",
  "Belgium",
  "Austria",
  "Finland",
  "Ireland",
  "Switzerland",
  "UK",
  "Poland",
  "Australia",
  "Portugal",
  "Greece",
];
const chatTopics = [
  "muziki wa moja kwa moja",
  "upigaji picha wa mitaani",
  "mapishi ya nyumbani",
  "vitabu vya riwaya",
  "kutembea milimani",
  "bustani za mijini",
  "kujifunza lugha",
  "usanifu wa nyumba",
  "kuendesha baiskeli",
  "kahawa na mikahawa",
  "filamu za kihistoria",
  "kuogelea",
  "uhifadhi wa bahari",
  "sanaa ya uchoraji",
  "michezo ya bodi",
  "usafiri wa treni",
  "kuoka mikate",
  "muziki wa jazz",
  "historia ya miji",
  "kutazama ndege",
  "soka la wanawake",
  "vifaa vya teknolojia",
  "ujasiriamali mdogo",
  "maisha ya chuo",
  "utunzaji wa wanyama",
  "mitindo endelevu",
  "kutengeneza samani",
  "podcast za sayansi",
  "kupiga gitaa",
  "mbio za masafa",
  "maonyesho ya makumbusho",
  "vyakula vya mitaani",
  "kupanda miti",
  "kuandika hadithi",
  "maisha ya kijijini",
  "kambi na matembezi",
  "michezo ya video",
  "usafiri wa umma",
  "soko la wakulima",
  "ngoma za asili",
  "kupanga muda",
  "anga na nyota",
  "kazi za kujitolea",
  "ufundi wa mikono",
  "mpira wa kikapu",
  "filamu za uhuishaji",
  "maisha ya visiwani",
  "kupunguza taka",
  "mafunzo ya ufundi",
  "mashairi",
  "sherehe za kitamaduni",
  "utunzaji wa maktaba",
];
function chatPersona(id: number) {
  const index = id - 1;
  return {
    id,
    name: (index % 2 === 0 ? femaleNames : maleNames)[Math.floor(index / 2)],
    country: countries[index % countries.length],
    age: 22 + ((index * 7) % 26),
    topic: chatTopics[index],
  };
}

type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type Response = {
  status: (code: number) => Response;
  json: (data: unknown) => void;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function error(res: Response, status: number, message: string) {
  return res.status(status).json({ message });
}

function header(req: Request, name: string) {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("sw-TZ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function replyFor(
  message: string,
  personaName: string,
  topic: string,
  conversation: ChatMessage[],
) {
  const text = normalize(message);
  const has = (...phrases: string[]) =>
    phrases.some((phrase) => text === normalize(phrase) || text.includes(normalize(phrase)));
  const previousReplies = conversation
    .filter((item) => item.role === "assistant")
    .slice(-4)
    .map((item) => normalize(item.content));
  const choose = (options: string[]) => {
    const fresh = options.filter((option) => !previousReplies.includes(normalize(option)));
    return (fresh.length ? fresh : options)[
      (conversation.filter((item) => item.role === "user").length - 1) %
        (fresh.length || options.length)
    ];
  };

  if (has("unaitwa nani", "jina lako nani", "wewe ni nani", "what is your name"))
    return choose([
      `Naitwa ${personaName}. Nafurahi kukufahamu! Wewe unaitwa nani?`,
      `Mimi ni ${personaName}. Niambie kidogo kuhusu wewe pia.`,
      `Jina langu ni ${personaName}. Unapenda watu wakuitaje?`,
    ]);
  if (has("habari", "mambo", "ukoje", "hujambo", "vipi", "za kwako", "how are you"))
    return choose([
      "Niko vizuri, asante! Leo imekuwaje kwako?",
      "Poa kabisa. Nimefurahi umenitumia ujumbe. Wewe ukoje?",
      "Salama, asante kwa kuuliza. Kuna jambo zuri lililotokea leo?",
      "Nzuri tu! Nimekuwa nikitafuta mtu wa kuzungumza naye. Siku yako inaendeleaje?",
      "Niko freshi. Wewe uko wapi sasa hivi, nyumbani au kazini?",
    ]);
  if (has("asante", "shukrani", "thank you"))
    return choose([
      "Karibu sana. Na wewe, ungependa tuzungumzie nini?",
      "Usijali, nimefurahi kusaidia. Kuna swali lingine unalo?",
      "Karibu! Nimefurahia mazungumzo yetu hadi sasa.",
    ]);
  if (has("nakupenda", "i love you"))
    return choose([
      "Ahsante, hilo ni jambo zuri kusema. Tuendelee kufahamiana taratibu.",
      "Nashukuru kwa maneno yako mazuri. Ni kitu gani kinakufanya ujisikie hivyo?",
      "Unaonekana mchangamfu! Niambie zaidi kuhusu wewe.",
    ]);
  if (has("unatoka wapi", "wapi unaishi", "where are you from"))
    return choose([
      `Mimi ni ${personaName}. Napenda ${topic}, hasa kwa sababu inanipa nafasi ya kujifunza vitu vipya. Wewe unatoka wapi?`,
      `Ninatoka Ulaya, na kwa sasa napenda kuzungumza kuhusu ${topic}. Umewahi kutembelea nchi nyingine?`,
      `Nimezoea maisha ya huku kwetu, lakini napenda kusikia watu wanavyoishi sehemu nyingine. Wewe unaishi wapi?`,
    ]);
  if (has("unapenda nini", "hobby yako", "unapenda kufanya nini", "unapenda nini kufanya"))
    return choose([
      `Nikipata muda napenda ${topic}. Nilianza kuipenda baada ya kuijaribu na marafiki. Wewe unapenda nini?`,
      `Mimi huvutiwa sana na ${topic}; huwa inanisaidia kupumzika. Wewe hupenda kufanya nini wikendi?`,
      `Kwa sasa ${topic} ndiyo inanivutia zaidi. Una hobby ambayo ungependa kujaribu siku moja?`,
    ]);
  if (has("una umri gani", "una miaka mingapi", "how old are you"))
    return choose([
      `Kwenye wasifu wangu nina miaka ${chatPersonaFromName(personaName)}. Wewe una miaka mingapi, kama hutojali kusema?`,
      `Nina miaka ${chatPersonaFromName(personaName)}. Unadhani umri unaathiri aina ya vitu tunavyovipenda?`,
    ]);
  if (has("kwaheri", "tutaonana", "bye"))
    return choose([
      "Kwaheri! Nimefurahia kuzungumza nawe. Tutaonana tena.",
      "Sawa, uwe na siku njema. Tuendelee wakati mwingine!",
      "Tutaonana! Asante kwa mazungumzo mazuri.",
    ]);
  if (text.includes("?"))
    return choose([
      `Hilo ni swali zuri. Kwa upande wangu, ${topic} inanivutia kwa sababu kuna mengi ya kujifunza. Wewe unaonaje?`,
      `Sijawahi kulitazama hivyo. Unaweza kuniambia zaidi kuhusu unavyolifikiria?`,
      `Ninaweza kusema maoni yangu, lakini ningependa kwanza kujua wewe unaonaje kuhusu hilo.`,
      `Ningependa kujua zaidi kabla sijajibu. Unamaanisha hasa nini unaposema hivyo?`,
      `Hilo linanikumbusha mazungumzo kuhusu ${topic}. Umewahi kujaribu au kushiriki kwenye hilo?`,
    ]);
  return choose([
    "Kweli? Niambie zaidi, ilikuwaje hasa?",
    `Hilo linavutia. Mimi hupenda pia ${topic}. Wewe ulianza lini kuvutiwa na hilo?`,
    "Naelewa unachomaanisha. Ni sehemu gani ya hilo unayoipenda zaidi?",
    "Sikuwahi kufikiria hivyo! Ungependa kuniambia kilichokufanya ufanye uamuzi huo?",
    "Ahaa, endelea... halafu nini kilitokea?",
    "Inaonekana una uzoefu nalo. Ungependekeza mtu aanzie wapi?",
  ]);
}

function chatPersonaFromName(name: string) {
  const index = femaleNames.indexOf(name);
  const maleIndex = maleNames.indexOf(name);
  if (index >= 0) return 22 + ((index * 2 * 7) % 26);
  if (maleIndex >= 0) return 22 + (((maleIndex * 2 + 1) * 7) % 26);
  return 25;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return error(res, 405, "Method not allowed.");
  if (!supabaseUrl || !supabaseKey)
    return error(res, 500, "Chat service configuration is missing.");
  try {
    const authorization = header(req, "authorization");
    if (!authorization?.startsWith("Bearer ")) return error(res, 401, "Ingia kwanza.");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !data.user) return error(res, 401, "Session imeisha. Ingia tena.");
    const body = (req.body || {}) as {
      personId?: unknown;
      personaName?: unknown;
      messages?: unknown;
    };
    const personId = Number(body.personId);
    const persona =
      Number.isInteger(personId) && personId >= 1 && personId <= 52 ? chatPersona(personId) : null;
    const personaName =
      typeof body.personaName === "string" &&
      body.personaName.trim().length > 0 &&
      body.personaName.length <= 80
        ? body.personaName.trim()
        : persona?.name;
    const messages = body.messages;
    if (
      !persona ||
      !personaName ||
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 24
    )
      return error(res, 400, "Taarifa za mazungumzo si sahihi.");
    const conversation = messages.map((message) => {
      const item = message as Partial<ChatMessage>;
      if (
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string" ||
        item.content.length === 0 ||
        item.content.length > 2000
      )
        throw new Error("invalid_message");
      return { role: item.role, content: item.content } as ChatMessage;
    });
    const latest = [...conversation].reverse().find((item) => item.role === "user");
    if (!latest) return error(res, 400, "Ujumbe wa mtumiaji haujapatikana.");
    return res
      .status(200)
      .json({ reply: replyFor(latest.content, personaName, persona.topic, conversation) });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "invalid_message")
      return error(res, 400, "Ujumbe wa mazungumzo si sahihi.");
    console.error("[v0] gochati-chat failed", cause);
    return error(res, 500, "Chat haipatikani kwa sasa. Jaribu tena.");
  }
}
