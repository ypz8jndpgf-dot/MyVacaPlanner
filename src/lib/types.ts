export type Rsvp = "in" | "out" | "maybe";

export interface Attendee {
  id: string;
  name: string;
  rsvp: Rsvp;
  isOrganizer: boolean;
  createdAt: number;
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

/** A recorded settle-up transfer (someone actually paid someone back). */
export interface Payment {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  createdAt: number;
}

export interface Trip {
  slug: string;
  name: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: number;
  attendees: Attendee[];
  schedule: ScheduleItem[];
  flights: Flight[];
  expenses: Expense[];
  payments: Payment[];
}

export interface DB {
  trips: Trip[];
}

export interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
}
