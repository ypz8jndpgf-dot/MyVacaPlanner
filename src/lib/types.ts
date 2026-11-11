export type Rsvp = "in" | "out" | "maybe";

export interface Attendee {
  id: string;
  name: string;
  rsvp: Rsvp;
  isOrganizer: boolean;
  createdAt: number;
  /** Optional payment handles (no @ / $ prefix) for one-tap settle-up links. */
  venmo?: string;
  cashapp?: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (24h) or free text
  location?: string;
  notes?: string;
  createdBy: string; // attendee id
  createdAt: number;
}

export type FlightDirection = "inbound" | "outbound";

export interface Flight {
  id: string;
  attendeeId: string;
  direction: FlightDirection;
  airline: string;
  flightNumber: string;
  date: string; // YYYY-MM-DD
  departTime: string; // HH:MM
  arriveTime: string; // HH:MM
  fromAirport: string;
  toAirport: string;
  createdBy: string; // attendee id
  createdAt: number;
}

export interface Expense {
  id: string;
  description: string;
  amountCents: number;
  paidBy: string; // attendee id
  splitAmong: string[]; // attendee ids, equal split
  date: string; // YYYY-MM-DD
  createdBy: string; // attendee id
  createdAt: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  note?: string;
  checked: boolean;
  checkedBy?: string; // attendee id
  createdBy: string; // attendee id
  createdAt: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // attendee ids; one vote per attendee per poll
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  closed: boolean;
  createdBy: string; // attendee id
  createdAt: number;
}

/** A shared to-bring / packing item: like a shopping item, plus who brings it. */
export interface PackingItem {
  id: string;
  name: string;
  quantity?: string;
  note?: string;
  assignedTo?: string; // attendee id who'll bring it
  checked: boolean; // packed / handled
  checkedBy?: string; // attendee id
  createdBy: string; // attendee id
  createdAt: number;
}

/** A recorded settle-up transfer (someone actually paid someone back). */
export interface Payment {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  createdAt: number;
}

/** Where the crew is staying — one stay per trip, editable by any attendee. */
export interface LodgingInfo {
  /** "Airbnb", a hotel name, "Mom's house"… */
  name: string;
  address?: string;
  /** Free text, e.g. "Fri 3pm" / "Mon 11am". */
  checkIn?: string;
  checkOut?: string;
  /** Door / gate / lockbox code. */
  accessCode?: string;
  wifi?: string;
  /** Host or front-desk contact. */
  contact?: string;
  /** Listing / booking link (Airbnb, hotel, …). */
  url?: string;
  notes?: string;
  updatedBy?: string;
  updatedAt?: number;
}

export interface Trip {
  slug: string;
  name: string;
  location: string;
  lodging?: LodgingInfo;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: number;
  attendees: Attendee[];
  schedule: ScheduleItem[];
  flights: Flight[];
  expenses: Expense[];
  payments: Payment[];
  shopping: ShoppingItem[];
  polls: Poll[];
  packing: PackingItem[];
}

export interface DB {
  trips: Trip[];
  /** Geocode cache: query string -> coordinates (Nominatim results). */
  geo?: Record<string, { lat: number; lon: number }>;
}

export interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
}
