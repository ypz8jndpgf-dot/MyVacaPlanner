export type Rsvp = "in" | "out" | "maybe";

export interface Attendee {
  id: string;
  name: string;
  rsvp: Rsvp;
  isOrganizer: boolean;
  createdAt: number;
  /** Contact email — the identity anchor. Required by the API for every new
   *  join, claim, and trip creation since Nov 26, 2026; optional in the type
   *  only because pre-email records don't have one (those attendees are
   *  prompted for it when they next claim their name). Used for trip mail
   *  only — never marketing, never shared outside the trip. */
  email?: string;
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

/** How an attendee's share was actually paid (Organizer Pass tracking). */
export type SharePaymentMethod = "venmo" | "cashapp" | "card" | "cash";

/** One attendee's recorded payment toward one expense share, or toward
 *  the group fund. A share is either marked paid (whole share) or not. */
export interface SharePayment {
  paidAt: number;
  method: SharePaymentMethod;
  txnRef?: string;
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
  /** Organizer Pass paid-up tracking: attendee id -> share payment mark.
   *  Absent on free trips and on expenses logged before the pass. */
  payments?: Record<string, SharePayment>;
}

/** Organizer Pass purchase record (one-time per trip, set by the Stripe
 *  webhook only — never trusted from a client or a redirect). */
export interface TripPass {
  purchasedAt: number;
  byName: string; // organizer attendee name at purchase time
  stripeSessionId: string;
}

/** Group fund: a flat per-person amount the crew chips in (house deposit,
 *  tee times…). Tracked against `fundPayments` on the trip. */
export interface TripFund {
  label: string;
  perPersonCents: number;
}

/** Pinned organizer announcement, shown at the top of the Plan tab. */
export interface TripAnnouncement {
  text: string;
  byName: string;
  at: number;
  /** Set only on the automatic pass-upgrade announcement the Stripe webhook
   *  pins when a pass is granted; renders as the Premium banner instead of
   *  the plain card. Organizer-written announcements never carry it. */
  auto?: "pass-upgrade";
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
  /** Wi-Fi network name. */
  wifi?: string;
  wifiPassword?: string;
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
  /* ---- Organizer Pass (all optional; absent on free trips) ---- */
  /** Set by the Stripe webhook when the one-time pass is purchased. */
  pass?: TripPass;
  /** Attendee ids with organizer powers, creator first. When absent,
   *  derived from attendees' isOrganizer flags (see organizerIds()). */
  organizers?: string[];
  /** Group fund definition; payments tracked in fundPayments. */
  fund?: TripFund;
  /** Fund paid marks: attendee id -> payment mark. */
  fundPayments?: Record<string, SharePayment>;
  /** Pinned announcement at the top of the Plan tab. */
  announcement?: TripAnnouncement;
  /** When true, only organizers may add/edit/delete schedule items. */
  itineraryLocked?: boolean;
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
