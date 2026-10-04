import mia from "@/assets/mia.jpg";
import adam from "@/assets/adam.jpg";
import elizabeth from "@/assets/elizabeth.jpg";
import benjamin from "@/assets/benjamin.jpg";

export const people = [
  { id: "Mia", name: "Mia", image: mia, topic: "Ngoma na kubadilishana utamaduni", minutes: 35, amount: 33500, rating: "4.8", prompt: "Habari! 👋 Unapenda ngoma gani za Tanzania?" },
  { id: "Elizabeth", name: "Elizabeth", image: elizabeth, topic: "Historia na hadithi za Kiswahili", minutes: 46, amount: 44500, rating: "4.9", prompt: "Habari! Unaweza kunisimulia hadithi ya Tanzania?" },
  { id: "Adam", name: "Adam", image: adam, topic: "Kazi za mtandaoni", minutes: 55, amount: 53500, rating: "4.7", prompt: "Habari! Unapenda kufanya kazi gani mtandaoni?" },
  { id: "Benjamin", name: "Benjamin", image: benjamin, topic: "Uwekezaji na kuweka akiba", minutes: 54, amount: 52500, rating: "4.7", prompt: "Habari! Unaanzaje kuweka akiba kidogo kidogo?" },
  { id: "Maya", name: "Maya", image: mia, topic: "Utamaduni na Kiswahili", minutes: 36, amount: 34500, rating: "4.9", prompt: "Habari! Unamsalimiaje rafiki yako kwa Kiswahili?" },
  { id: "Oliver", name: "Oliver", image: adam, topic: "Safari na maeneo ya kutembelea", minutes: 42, amount: 40500, rating: "4.8", prompt: "Habari! Ni sehemu gani nzuri ya kutembelea Tanzania?" },
  { id: "Chloe", name: "Chloe", image: elizabeth, topic: "Mapishi na vyakula vya asili", minutes: 36, amount: 34500, rating: "4.8", prompt: "Habari! Chakula gani cha Tanzania unakipenda zaidi?" },
  { id: "James", name: "James", image: benjamin, topic: "Mpira wa kikapu na mazoezi", minutes: 43, amount: 41500, rating: "4.6", prompt: "Habari! Unacheza mchezo gani?" },
  { id: "Lily", name: "Lily", image: mia, topic: "Sanaa na ubunifu", minutes: 32, amount: 30500, rating: "4.8", prompt: "Habari! Ni nini kinakupa msukumo wa kubuni?" },
  { id: "Harper", name: "Harper", image: elizabeth, topic: "Mazoezi ya mazungumzo", minutes: 34, amount: 32500, rating: "4.6", prompt: "Habari! Tufanye mazoezi ya kuzungumza Kiswahili?" },
  { id: "William", name: "William", image: adam, topic: "Michezo na mpira wa miguu", minutes: 55, amount: 53500, rating: "4.8", prompt: "Habari! Unashabikia timu gani ya mpira?" },
  { id: "Zoe", name: "Zoe", image: mia, topic: "Ununuzi na mitindo", minutes: 40, amount: 38500, rating: "4.9", prompt: "Habari! Unapenda mtindo gani wa mavazi?" },
];

export const money = (amount: number) => `TZS ${amount.toLocaleString("en-US")}`;