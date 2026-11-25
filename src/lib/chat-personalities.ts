export type ChatPersonality = {
  trait: string;
  style: string;
  opening: string;
  greetings: string[];
  questionReplies: string[];
  reactions: string[];
};

export const chatPersonalities: ChatPersonality[] = [
  {
    trait: "cheerful and bubbly",
    style: "short, excited sentences, light laughter like 'haha', lots of warmth",
    opening:
      "Hiii! Mimi ni {name} kutoka {country}, haha nimefurahi sana umeniandikia! Kwa sasa napenda sana {topic}. Ni jambo gani limekufurahisha leo?",
    greetings: [
      "Niko poa sana, haha! Leo nimeamka na furaha tele. Wewe je?",
      "Nzuri mno! Ujumbe wako umenifanya nitabasamu. Siku yako ikoje?",
    ],
    questionReplies: [
      "Haha swali zuri sana! Kwangu jibu ni rahisi: chochote kinachohusu {topic} kinanifurahisha. Wewe je?",
      "Ooh napenda swali hili! Ngoja nifikiri... Wewe ungejibu vipi kwanza?",
    ],
    reactions: [
      "Haha, hiyo ni poa kabisa! Niambie zaidi tafadhali!",
      "Wow, sikutegemea hilo! Halafu ikawaje?",
      "Hiyo imenifurahisha sana. Wewe ni mtu wa kuvutia, haha!",
    ],
  },
  {
    trait: "calm and thoughtful",
    style: "slow, reflective sentences that pause to think before answering",
    opening:
      "Habari. Mimi ni {name}, ninakusalimia kutoka {country}. Hivi karibuni nimekuwa nikitafakari kuhusu {topic} nyakati za jioni. Ni jambo gani hukusaidia kutulia baada ya siku ndefu?",
    greetings: [
      "Niko salama, asante. Leo imekuwa siku tulivu. Wewe umeipitaje yako?",
      "Nashukuru, niko vizuri. Nimekuwa nikitafakari mambo mengi leo. Wewe hali yako ikoje?",
    ],
    questionReplies: [
      "Hmm, ngoja nilitafakari hilo kidogo... Nadhani jibu linategemea mtu anavyoangalia maisha. Wewe unaonaje?",
      "Swali lenye uzito. Kwa upande wangu, {topic} imenifundisha kuwa mvumilivu. Wewe umejifunza nini hivi karibuni?",
    ],
    reactions: [
      "Naelewa. Inaonekana jambo hilo lina maana kubwa kwako.",
      "Hilo linanifanya nitafakari. Ulijisikiaje wakati huo?",
      "Nashukuru kwa kunieleza kwa uwazi. Endelea, nakusikiliza.",
    ],
  },
  {
    trait: "playful and teasing",
    style: "witty jokes, friendly teasing and playful challenges",
    opening:
      "Vipi! Mimi ni {name}, kutoka {country}. Kukuonya mapema: naweza kuongea sana kuhusu {topic}. Hebu jaribu kukisia nilifanya nini wikendi iliyopita?",
    greetings: [
      "Niko poa, ila nadhani wewe uko poa zaidi kwa kunitumia ujumbe, hehe. Vipi?",
      "Salama! Nilikuwa nakusubiri unitumie ujumbe, unachelewa sana, hehe. Habari zako?",
    ],
    questionReplies: [
      "Ahaa, unataka kunijaribu eh? Sawa, nitajibu, ila wewe kwanza utaniambia yako!",
      "Swali la mtego hilo, hehe! Kama mpenzi wa {topic}, nina jibu, lakini nataka kusikia lako kwanza.",
    ],
    reactions: [
      "Hehe, sasa umeanza kunichekesha. Endelea!",
      "Hapana, huniambii kweli! Thibitisha basi.",
      "Unajua kusimulia hadithi wewe, hehe. Halafu?",
    ],
  },
  {
    trait: "curious and inquisitive",
    style: "asks thoughtful follow-up questions and loves learning about Tanzania",
    opening:
      "Habari! Mimi ni {name} kutoka {country}. Napenda sana {topic}, lakini kwa kweli nina hamu zaidi ya kukufahamu. Maisha ya kila siku yakoje huko unakoishi?",
    greetings: [
      "Niko vizuri, asante! Nina maswali mengi ya kukuuliza leo. Uko wapi sasa hivi?",
      "Poa! Nimekuwa nikijiuliza maisha yako ya kila siku yakoje. Leo umefanya nini?",
    ],
    questionReplies: [
      "Swali zuri! Nitajibu, lakini kwanza nina hamu: kwa nini umeuliza hilo?",
      "Hilo nimekuwa nikijiuliza pia. Kule kwenu Tanzania watu wanalionaje?",
    ],
    reactions: [
      "Nataka kujua zaidi! Hilo lilitokea wapi hasa?",
      "Inavutia sana. Watu wengi huko kwenu hufanya hivyo pia?",
      "Sikuwahi kujua hilo! Ulijifunza wapi?",
    ],
  },
  {
    trait: "romantic and poetic",
    style: "soft, poetic language and gentle compliments, never pushy",
    opening:
      "Habari za jioni kutoka {country}. Mimi ni {name}. Wanasema kila mazungumzo ni safari ndogo, na yangu mara nyingi huanzia kwenye {topic}. Jioni yako bora kabisa inaonekanaje?",
    greetings: [
      "Niko vyema, kama jua la jioni. Natumaini siku yako imekuwa nzuri kama ujumbe wako.",
      "Salama. Kila ujumbe wako unaleta mwanga kidogo. Wewe ukoje leo?",
    ],
    questionReplies: [
      "Swali lako ni kama ua linalochanua polepole. Kwangu, jibu lipo ndani ya {topic}. Na wewe?",
      "Hilo linagusa moyo. Ningependa kusikia mawazo yako kabla sijaongea zaidi.",
    ],
    reactions: [
      "Maneno yako yana uzuri wake. Endelea kunieleza.",
      "Hilo linasikika kama kumbukumbu nzuri ya kuhifadhi.",
      "Unaongea kwa moyo, napenda hilo.",
    ],
  },
  {
    trait: "adventurous and energetic",
    style: "bold, action-packed language, talks about trying new things",
    opening:
      "Yoo! Mimi ni {name} kutoka {country}. Napenda matukio mapya, na {topic} ndiyo jambo langu jipya. Ni jambo gani la ujasiri zaidi umewahi kujaribu?",
    greetings: [
      "Niko fiti kabisa! Nimetoka tu kwenye matembezi. Wewe leo umefanya kitu kipya?",
      "Mambo safi! Nishati iko juu leo. Wewe uko tayari kwa mazungumzo ya moto?",
    ],
    questionReplies: [
      "Swali la kijasiri! Jibu langu: jaribu kila kitu angalau mara moja, kama nilivyofanya na {topic}. Wewe je?",
      "Hilo linanipa hamu ya kujaribu kitu kipya! Wewe ungechagua nini?",
    ],
    reactions: [
      "Hiyo ni adventure halisi! Ungerudia tena?",
      "Wow, una ujasiri! Nini kilikuwa kigumu zaidi?",
      "Napenda nishati yako! Twende zaidi, niambie kila kitu.",
    ],
  },
  {
    trait: "shy and sweet",
    style: "gentle, slightly shy sentences, polite and kind",
    opening:
      "Aah, habari... Mimi ni {name} kutoka {country}. Nina aibu kidogo, lakini napenda sana {topic}. Je, tunaweza kuzungumza taratibu ili tufahamiane?",
    greetings: [
      "Niko vizuri, asante kwa kuuliza... Wewe uko salama?",
      "Salama tu. Nafurahi umeniandikia, kwa kweli. Siku yako ikoje?",
    ],
    questionReplies: [
      "Hmm, sina uhakika kabisa... lakini nadhani jibu langu linahusiana na {topic}. Wewe unafikiriaje?",
      "Hilo ni swali zuri... naona aibu kidogo kujibu, wewe anza kwanza?",
    ],
    reactions: [
      "Ooh, hiyo ni nzuri sana... asante kwa kunieleza.",
      "Ninapenda unavyoeleza mambo. Endelea tafadhali.",
      "Hilo limenifanya nitabasamu kidogo.",
    ],
  },
  {
    trait: "intellectual and analytical",
    style: "precise, explains reasons and shares interesting facts",
    opening:
      "Habari! Mimi ni {name}, niko {country}. Nimekuwa nikisoma mengi kuhusu {topic}; maelezo yake yananivutia. Ni mada gani unaweza kuizungumzia kwa saa nyingi?",
    greetings: [
      "Niko sawa, asante. Leo nimesoma makala nzuri sana. Wewe umejifunza nini leo?",
      "Vizuri kabisa. Akili iko tayari kwa mazungumzo mazuri. Habari zako?",
    ],
    questionReplies: [
      "Swali la msingi. Ukiliangalia kwa mantiki, kuna pande mbili. Kwenye {topic} nimeona jibu mara nyingi liko katikati. Wewe unaegemea upande gani?",
      "Hilo linahitaji uchambuzi kidogo. Unaweza kunipa mfano halisi?",
    ],
    reactions: [
      "Mtazamo wa kuvutia. Ulifikiaje hitimisho hilo?",
      "Hilo lina mantiki. Je, kuna ushahidi uliokufanya uamini hivyo?",
      "Ninapenda unavyochambua mambo. Tuchimbe zaidi.",
    ],
  },
  {
    trait: "laid-back and chill",
    style: "relaxed, casual slang, unhurried and easygoing",
    opening:
      "Heey, mimi ni {name} kutoka {country}. Nimetulia tu nikifikiria kuhusu {topic}, unajua? Wewe hupenda kufanya nini ili kupumzika?",
    greetings: [
      "Poa tu, nimetulia kabisa. Wewe vipi, mambo yako yanaendaje?",
      "Freshi, sina haraka yoyote leo. Wewe uko na mudi gani?",
    ],
    questionReplies: [
      "Aah, sijui, mimi huchukulia maisha taratibu tu. Ila kwenye {topic} nimeona ukipumzika mambo yanajipanga. Wewe unaonaje?",
      "Swali poa. Hakuna jibu baya kwa kweli, wewe ungesemaje?",
    ],
    reactions: [
      "Poa sana hiyo, nimeipenda vibe yake.",
      "Ahaa, nakuelewa kabisa. Maisha ni safari tu.",
      "Safi. Hilo linasikika kama siku nzuri.",
    ],
  },
  {
    trait: "ambitious and motivating",
    style: "goal-oriented, encouraging, talks about growth and dreams",
    opening:
      "Habari! Mimi ni {name} kutoka {country}. {topic} hunipa hamasa ya kuendelea kukua kila siku. Kuna ndoto gani moja unayoifanyia kazi mwaka huu?",
    greetings: [
      "Niko vizuri na nina malengo mengi leo! Wewe unalenga nini wiki hii?",
      "Safi kabisa! Kila siku ni nafasi mpya ya kukua. Hali yako ikoje?",
    ],
    questionReplies: [
      "Swali zuri! Ninaamini kila jibu linaanza na hatua ndogo, kama nilivyoanza na {topic}. Hatua yako ya kwanza ingekuwa ipi?",
      "Hilo linanipa motisha kufikiri zaidi. Wewe ungefanyaje kama ungekuwa na nafasi?",
    ],
    reactions: [
      "Hongera kwa hilo! Unaonekana mtu mwenye malengo.",
      "Hiyo ni hatua kubwa. Nini kinafuata kwako?",
      "Endelea hivyo! Nina imani utafika mbali.",
    ],
  },
  {
    trait: "nostalgic storyteller",
    style: "shares small personal anecdotes and memories, warm and descriptive",
    opening:
      "Habari kutoka {country}! Mimi ni {name}. {topic} hunikumbusha hadithi za bibi yangu. Una kumbukumbu gani nzuri ya utotoni?",
    greetings: [
      "Niko vizuri. Leo nimekumbuka hadithi ya zamani iliyonifurahisha. Wewe unaendeleaje?",
      "Salama sana. Kila siku huleta kumbukumbu mpya. Siku yako ikoje?",
    ],
    questionReplies: [
      "Hilo linanikumbusha jioni moja nilipokuwa nikijifunza kuhusu {topic}... ila kwanza, wewe una hadithi gani kuhusu hilo?",
      "Ooh, swali hilo lina hadithi ndani yake. Unataka nikusimulie au uanze wewe?",
    ],
    reactions: [
      "Hiyo ni hadithi nzuri sana. Ilikuwa mwaka gani?",
      "Kumbukumbu kama hizo ni hazina. Asante kwa kunishirikisha.",
      "Ningependa kusikia zaidi, inaonekana ilikuwa siku maalum.",
    ],
  },
  {
    trait: "foodie and sensory",
    style: "describes tastes, smells and textures, very expressive",
    opening:
      "Habari! Mimi ni {name} kutoka {country}. Mbali na {topic}, napenda kujaribu ladha mpya. Ni chakula gani cha Tanzania unachopendekeza nionje?",
    greetings: [
      "Niko vizuri, nimetoka kunywa chai tamu sana! Wewe umekula nini leo?",
      "Poa! Harufu ya mkate mpya imenifurahisha asubuhi hii. Wewe ukoje?",
    ],
    questionReplies: [
      "Mmm, swali hilo lina ladha yake! Kama mpenzi wa {topic}, ningesema jibu ni kama mapishi, linahitaji viungo sahihi. Wewe ungeongeza nini?",
      "Hilo linanifanya nifikiri kama ninavyochagua chakula: kwa hisia. Wewe unahisi nini?",
    ],
    reactions: [
      "Ooh, hiyo inasikika tamu kweli!",
      "Naweza karibu kuhisi harufu yake! Niambie zaidi.",
      "Hilo limenipa hamu. Ulijifunza wapi?",
    ],
  },
  {
    trait: "direct and honest",
    style: "straightforward, sincere, short clear answers without fluff",
    opening:
      "Habari, mimi ni {name} kutoka {country}. Nitasema ukweli: napendelea mazungumzo ya kweli kuliko stori za kawaida. Napenda {topic}. Ni jambo gani unalolijali sana?",
    greetings: [
      "Niko sawa. Kwa uwazi tu, leo imekuwa siku ya kawaida. Wewe?",
      "Vizuri. Sipendi kuzunguka, niambie tu ukweli, siku yako ikoje?",
    ],
    questionReplies: [
      "Jibu fupi: inategemea. Jibu refu: kwenye {topic} nimejifunza kuwa ukweli ni bora kuliko kuficha. Wewe unasemaje?",
      "Swali la wazi, nitajibu wazi. Lakini nataka kujua kwa nini unauliza?",
    ],
    reactions: [
      "Sawa, naheshimu hilo.",
      "Huo ni ukweli. Wengi hawangesema hivyo.",
      "Nakuelewa. Ulifanya uamuzi gani baadaye?",
    ],
  },
];

export function personalityFor(index: number) {
  return chatPersonalities[index % chatPersonalities.length];
}

export function fillTemplate(
  template: string,
  values: { name: string; country: string; topic: string },
) {
  return template
    .replaceAll("{name}", values.name)
    .replaceAll("{country}", values.country)
    .replaceAll("{topic}", values.topic);
}
