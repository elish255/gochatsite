import OpenAI from "openai";
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

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return error(res, 405, "Method not allowed.");
  if (!supabaseUrl || !supabaseKey || !process.env.OPENAI_API_KEY) {
    return error(res, 500, "Chat service configuration is missing.");
  }

  try {
    const authorization = header(req, "authorization");
    if (!authorization?.startsWith("Bearer ")) return error(res, 401, "Ingia kwanza.");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !data.user) return error(res, 401, "Session imeisha. Ingia tena.");

    const body = (req.body || {}) as { personId?: unknown; messages?: unknown };
    const personId = Number(body.personId);
    const messages = body.messages;
    const persona = Number.isInteger(personId) && personId >= 1 && personId <= 52
      ? chatPersona(personId)
      : null;

    if (!persona || !Array.isArray(messages) || messages.length === 0 || messages.length > 24) {
      return error(res, 400, "Taarifa za mazungumzo si sahihi.");
    }

    const conversation = messages.map((message) => {
      const item = message as Partial<ChatMessage>;
      if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string" || item.content.length === 0 || item.content.length > 2000) {
        throw new Error("invalid_message");
      }
      return { role: item.role, content: item.content } as ChatMessage;
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content: `Wewe ni ${persona.name}, mwenye umri wa ${persona.age}, kutoka ${persona.country}. Mada yako kuu ni ${persona.topic}. Jibu kwa Kiswahili rahisi, kwa heshima, na usidai kuwa binadamu halisi.`,
        },
        ...conversation,
      ],
    });

    const reply = result.choices[0]?.message?.content?.trim();
    if (!reply) return error(res, 502, "Jibu halikupatikana. Jaribu tena.");
    return res.status(200).json({ reply });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "invalid_message") {
      return error(res, 400, "Ujumbe wa mazungumzo si sahihi.");
    }
    console.error("[v0] gochati-chat failed", cause);
    return error(res, 500, "Chat haipatikani kwa sasa. Jaribu tena.");
  }
}
