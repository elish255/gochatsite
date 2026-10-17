import logoUrl from "@/assets/gochati-logo.png";
import alternatePortrait from "@/assets/adam.jpg";

// Bundle the supplied reference media so deployment resolves every image URL.
const referencePortraits = import.meta.glob<string>("/src/assets/chatdunia/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
});
export { logoUrl };
export const portraitFallback = (key: string) => `/avators/${key}.svg`;
export const portraits = Object.fromEntries(
  Array.from({ length: 52 }, (_, index) => {
    const gender = index % 2 === 0 ? "women" : "men";
    const number = Math.floor(index / 2) + 10;
    // The supplied men-15 and men-17 files contain the same photo.
    const photo = gender === "men" && number === 17
      ? alternatePortrait
      : referencePortraits[`/src/assets/chatdunia/${gender}-${number}.jpg`];
    return [`person-${index + 1}`, photo];
  }),
);
