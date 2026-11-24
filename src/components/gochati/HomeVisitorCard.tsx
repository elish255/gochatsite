import { ArrowRight, MessageCircle, Phone, Video } from "lucide-react";

type Visitor = {
  id: number;
  name: string;
  age: number;
  country: string;
  flag: string;
  photo: string;
  fallbackPhoto: string;
  online: boolean;
  topic: string;
  rate: { amount: number };
};

type HomeVisitorCardProps = {
  person: Visitor;
  onChat: () => void;
  onCall: (kind: "voice" | "video") => void;
};

export function HomeVisitorCard({ person, onChat, onCall }: HomeVisitorCardProps) {
  return (
    <article className="home-visitor-card">
      <header className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={person.photo}
              onError={(event) => {
                if (event.currentTarget.getAttribute("src") !== person.fallbackPhoto) {
                  event.currentTarget.src = person.fallbackPhoto;
                }
              }}
              alt={person.name}
              loading="lazy"
              className="size-16 rounded-full border-2 border-primary/60 object-cover"
            />
            <span
              aria-label={person.online ? "Online" : "Offline"}
              className={`absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-card ${person.online ? "bg-success" : "bg-muted-foreground"}`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">
              {person.flag} {person.name}
            </h3>
            <p
              className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${person.online ? "text-success" : "text-muted-foreground"}`}
            >
              <span
                className={`size-2 rounded-full ${person.online ? "bg-success" : "bg-muted-foreground"}`}
                aria-hidden="true"
              />
              {person.online ? "Online" : "Offline"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">Miaka {person.age}</p>
          </div>
        </div>
      </header>

      <div className="home-visitor-details">
        <div className="home-visitor-detail">
          <span>NCHI</span>
          <strong>{person.country}</strong>
        </div>
        <div className="home-visitor-detail">
          <span>MADA</span>
          <strong className="truncate">{person.topic}</strong>
        </div>
      </div>

      <div className="home-visitor-rate">TZS {person.rate.amount.toLocaleString("en-US")}</div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
        <button type="button" onClick={onChat} className="home-visitor-chat">
          <MessageCircle className="size-4" aria-hidden="true" />
          Anza Chat
          <ArrowRight className="ml-auto size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onCall("voice")}
          className="home-visitor-call"
          aria-label={`Piga simu ya sauti kwa ${person.name}`}
          title="Voice call"
        >
          <Phone className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onCall("video")}
          className="home-visitor-call"
          aria-label={`Piga simu ya video kwa ${person.name}`}
          title="Video call"
        >
          <Video className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
