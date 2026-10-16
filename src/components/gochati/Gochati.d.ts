import type { ReactElement } from "react";
export function Gochati(): ReactElement;

type Person = { id: number; name: string; photo: string; flag: string };
export function ChatSession(props: {
  person: Person;
  active?: boolean;
  onClose: () => void;
  onPaid: (amount: number, sessionId: string | null) => void;
}): ReactElement;
export function CallDialog(props: {
  person: Person;
  kind: string;
  active?: boolean;
  onClose: () => void;
}): ReactElement;
