import { Button } from "@/components/ui/button";

const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8sGGq1yT2CciXWiz45";

export function ChannelButton() {
  return (
    <Button
      asChild
      className="gochati-channel-float fixed bottom-[6.25rem] right-5 z-50 h-auto rounded-full bg-[#128C7E] px-4 py-3 font-semibold text-white shadow-lg hover:bg-[#0f766e]"
    >
      <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" aria-label="Jiunge na Channel ya Gochati kwenye WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mr-2 size-5 fill-current">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .15 5.34.15 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.65a11.9 11.9 0 0 0 5.78 1.47h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.47-8.42ZM12.07 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.73.98.99-3.64-.24-.37a9.86 9.86 0 0 1-1.52-5.26c0-5.47 4.45-9.92 9.91-9.92a9.85 9.85 0 0 1 7.02 2.91 9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.91-9.93 9.91Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
        </svg>
        Jiunge na Channel
      </a>
    </Button>
  );
}
