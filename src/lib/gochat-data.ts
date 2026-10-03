import mia from "@/assets/mia.jpg";
import adam from "@/assets/adam.jpg";
import elizabeth from "@/assets/elizabeth.jpg";
import benjamin from "@/assets/benjamin.jpg";

export const people = [
  { id: "Mia", name: "Mia", image: mia, topic: "Dance & Culture Exchange", minutes: 35, amount: 33500, rating: "4.8", prompt: "Hi 👋 How do I say I AM LEARNING SWAHILI?", answer: "NINAJIFUNZA KISWAHILI" },
  { id: "Elizabeth", name: "Elizabeth", image: elizabeth, topic: "Swahili History & Stories", minutes: 46, amount: 44500, rating: "4.9", prompt: "Tell me a story about Tanzania!", answer: "Tanzania ina hadithi nyingi za kuvutia." },
  { id: "Adam", name: "Adam", image: adam, topic: "Freelancing Online", minutes: 55, amount: 53500, rating: "4.7", prompt: "What do you enjoy doing online?", answer: "Ninapenda kujifunza na kushirikiana na wengine." },
  { id: "Benjamin", name: "Benjamin", image: benjamin, topic: "Investing & Savings Tips", minutes: 54, amount: 52500, rating: "4.7", prompt: "What's a good way to start saving?", answer: "Kuweka malengo madogo ni mwanzo mzuri." },
  { id: "Maya", name: "Maya", image: mia, topic: "Culture & Kiswahili", minutes: 36, amount: 34500, rating: "4.9", prompt: "How do you greet a friend in Swahili?", answer: "Habari yako?" },
  { id: "Oliver", name: "Oliver", image: adam, topic: "Travel & Local Places", minutes: 42, amount: 40500, rating: "4.8", prompt: "Where should I visit in Tanzania?", answer: "Unaweza kutembelea Zanzibar au Serengeti." },
  { id: "Chloe", name: "Chloe", image: elizabeth, topic: "Cooking & Local Food", minutes: 36, amount: 34500, rating: "4.8", prompt: "What's your favorite Tanzanian dish?", answer: "Napenda pilau na mishkaki." },
  { id: "James", name: "James", image: benjamin, topic: "Basketball & Fitness", minutes: 43, amount: 41500, rating: "4.6", prompt: "Do you play any sports?", answer: "Ndiyo, ninapenda mpira wa kikapu." },
  { id: "Lily", name: "Lily", image: mia, topic: "Art & Creative Chat", minutes: 32, amount: 30500, rating: "4.8", prompt: "What inspires your creativity?", answer: "Muziki na mazingira hunipa mawazo mapya." },
  { id: "Harper", name: "Harper", image: elizabeth, topic: "Casual Chat Practice", minutes: 34, amount: 32500, rating: "4.6", prompt: "Let's practice a little Swahili!", answer: "Karibu, tufanye mazoezi pamoja." },
  { id: "William", name: "William", image: adam, topic: "Sports & Football Chat", minutes: 55, amount: 53500, rating: "4.8", prompt: "Which football team do you support?", answer: "Ninafurahia kuangalia mechi mbalimbali." },
  { id: "Zoe", name: "Zoe", image: mia, topic: "Shopping & Fashion", minutes: 40, amount: 38500, rating: "4.9", prompt: "What styles do you love?", answer: "Napenda mitindo yenye rangi na ubunifu." },
];

export const money = (amount: number) => `TZS ${amount.toLocaleString("en-US")}`;