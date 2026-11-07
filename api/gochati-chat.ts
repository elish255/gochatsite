import { createClient } from "@supabase/supabase-js";


const femaleNames = ["Emma","Sophie","Hannah","Laura","Marie","Julia","Anna","Chloe","Lucia","Elena","Nora","Ida","Freya","Katrin","Isabel","Amelie","Clara","Sara","Nina","Maja","Olivia","Lena","Alice","Ella","Mia","Eva"];
const maleNames = ["Lucas","Daniel","Thomas","Peter","Jonas","Marc","Oliver","Henrik","Felix","Andreas","Mateo","Erik","Liam","Noah","Adrian","Simon","Victor","Pablo","Nils","Kevin","Jack","Leon","Hugo","Max","Sven","Oscar"];
const countries = ["Germany","France","Sweden","Norway","USA","Canada","Italy","Spain","Netherlands","Denmark","Belgium","Austria","Finland","Ireland","Switzerland","UK","Poland","Australia","Portugal","Greece"];
const chatTopics = ["muziki wa moja kwa moja","upigaji picha wa mitaani","mapishi ya nyumbani","vitabu vya riwaya","kutembea milimani","bustani za mijini","kujifunza lugha","usanifu wa nyumba","kuendesha baiskeli","kahawa na mikahawa","filamu za kihistoria","kuogelea","uhifadhi wa bahari","sanaa ya uchoraji","michezo ya bodi","usafiri wa treni","kuoka mikate","muziki wa jazz","historia ya miji","kutazama ndege","soka la wanawake","vifaa vya teknolojia","ujasiriamali mdogo","maisha ya chuo","utunzaji wa wanyama","mitindo endelevu","kutengeneza samani","podcast za sayansi","kupiga gitaa","mbio za masafa","maonyesho ya makumbusho","vyakula vya mitaani","kupanda miti","kuandika hadithi","maisha ya kijijini","kambi na matembezi","michezo ya video","usafiri wa umma","soko la wakulima","ngoma za asili","kupanga muda","anga na nyota","kazi za kujitolea","ufundi wa mikono","mpira wa kikapu","filamu za uhuishaji","maisha ya visiwani","kupunguza taka","mafunzo ya ufundi","mashairi","sherehe za kitamaduni","utunzaji wa maktaba"];
function chatPersona(id: number) {
  const index = id - 1;
  return { id, name: (index % 2 === 0 ? femaleNames : maleNames)[Math.floor(index / 2)], country: countries[index % countries.length], age: 22 + ((index * 7) % 26), topic: chatTopics[index] };
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
  return value.toLocaleLowerCase("sw-TZ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function replyFor(message: string, personaName: string, topic: string) {
  const text = normalize(message);
  const has = (...phrases: string[]) => phrases.some((phrase) => text === normalize(phrase) || text.includes(normalize(phrase)));
  if (has("unaitwa nani", "jina lako nani", "wewe ni nani", "what is your name")) return `Naitwa ${personaName}. Nafurahi kukufahamu!`;
  if (has("habari", "mambo", "ukoje", "hujambo", "vipi", "za kwako", "how are you")) return [
    `Salama kabisa! Asante kwa kuniuliza 😊 Wewe ukoje?`,
    `Poa sana! Nafurahi kuzungumza nawe. Habari zako?`,
    `Nzuri kabisa, karibu tuzungumze! Wewe mambo yako vipi?`,
  ][text.length % 3];
  if (has("asante", "shukrani", "thank you")) return "Karibu sana! Nimefurahi kuzungumza nawe 😊";
  if (has("nakupenda", "i love you")) return "Ahsante kwa maneno mazuri 😊 Nimefurahi kuwa nawe hapa.";
  if (has("unatoka wapi", "wapi unaishi", "where are you from")) return `Mimi ni ${personaName}, nafurahia mada ya ${topic}. Wewe unatoka wapi?`;
  if (has("unapenda nini", "hobby yako", "unapenda kufanya nini", "unapenda nini kufanya")) return `Napenda kuzungumzia ${topic}. Wewe unapenda kufanya nini wakati wako wa ziada?`;
  if (has("una umri gani", "una miaka mingapi", "how old are you")) return `Kwenye wasifu wangu nina miaka ${chatPersonaFromName(personaName)}. Na wewe je?`;
  if (has("kwaheri", "tutaonana", "bye")) return "Kwaheri! Nimefurahi kuzungumza nawe. Tutaonana tena 😊";
  if (text.includes("?")) return `Swali zuri 😊 Sina jibu lililohifadhiwa kwa hilo bado. Tunaweza kuzungumzia ${topic}; una maoni gani?`;
  return `Nimekusikia 😊 Niambie zaidi kuhusu hilo. Mimi napenda kuzungumzia ${topic}.`;
}

function chatPersonaFromName(name: string) {
  const index = femaleNames.indexOf(name);
  const maleIndex = maleNames.indexOf(name);
  if (index >= 0) return 22 + (((index * 2) * 7) % 26);
  if (maleIndex >= 0) return 22 + (((maleIndex * 2 + 1) * 7) % 26);
  return 25;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return error(res, 405, "Method not allowed.");
  if (!supabaseUrl || !supabaseKey) return error(res, 500, "Chat service configuration is missing.");
  try {
    const authorization = header(req, "authorization");
    if (!authorization?.startsWith("Bearer ")) return error(res, 401, "Ingia kwanza.");
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !data.user) return error(res, 401, "Session imeisha. Ingia tena.");
    const body = (req.body || {}) as { personId?: unknown; personaName?: unknown; messages?: unknown };
    const personId = Number(body.personId);
    const persona = Number.isInteger(personId) && personId >= 1 && personId <= 52 ? chatPersona(personId) : null;
    const personaName = typeof body.personaName === "string" && body.personaName.trim().length > 0 && body.personaName.length <= 80 ? body.personaName.trim() : persona?.name;
    const messages = body.messages;
    if (!persona || !personaName || !Array.isArray(messages) || messages.length === 0 || messages.length > 24) return error(res, 400, "Taarifa za mazungumzo si sahihi.");
    const conversation = messages.map((message) => {
      const item = message as Partial<ChatMessage>;
      if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string" || item.content.length === 0 || item.content.length > 2000) throw new Error("invalid_message");
      return { role: item.role, content: item.content } as ChatMessage;
    });
    const latest = [...conversation].reverse().find((item) => item.role === "user");
    if (!latest) return error(res, 400, "Ujumbe wa mtumiaji haujapatikana.");
    return res.status(200).json({ reply: replyFor(latest.content, personaName, persona.topic) });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "invalid_message") return error(res, 400, "Ujumbe wa mazungumzo si sahihi.");
    console.error("[v0] gochati-chat failed", cause);
    return error(res, 500, "Chat haipatikani kwa sasa. Jaribu tena.");
  }
}
