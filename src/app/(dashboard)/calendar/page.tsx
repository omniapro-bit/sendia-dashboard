"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import type { CalendarEvent, CalendarEventsResponse } from "@/lib/types";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "bg-amber-500/10", text: "text-amber-400", label: "En attente" },
  confirmed: { bg: "bg-green-500/10", text: "text-green-400", label: "Confirmé" },
  expired:   { bg: "bg-[#2a2a3a]",    text: "text-[#66667a]", label: "Expiré" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function groupByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const day = ev.date_start.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(ev);
  }
  return groups;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCalendarEvents()
      .then((res: CalendarEventsResponse) => setEvents(res.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByDay(events);
  const days = Object.keys(grouped).sort().reverse();

  return (
    <div className="px-6 md:px-10 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Calendrier</h1>
        <p className="text-[#9999b0] text-sm mt-1">
          Rendez-vous détectés automatiquement dans vos emails.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : events.length === 0 ? (
        <div className="bg-[#12121a] border border-[#2a2a3a] rounded-2xl p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1c1c28] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#66667a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-[#9999b0] text-sm">
            Aucun rendez-vous détecté pour le moment.
          </p>
          <p className="text-[#66667a] text-xs mt-2">
            Sendia détecte automatiquement les rendez-vous dans vos emails entrants.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-[#9999b0] uppercase tracking-wider mb-3">
                {formatDate(grouped[day][0].date_start)}
              </h2>
              <div className="space-y-3">
                {grouped[day].map((ev) => {
                  const style = STATUS_STYLES[ev.status] ?? STATUS_STYLES.pending;
                  return (
                    <div key={ev.id} className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 text-center">
                        <p className="text-lg font-bold text-[#f0f0f5]">{formatTime(ev.date_start)}</p>
                        <p className="text-xs text-[#66667a]">{formatTime(ev.date_end)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f0f0f5] font-medium truncate">{ev.title}</p>
                        {ev.location && (
                          <p className="text-[#9999b0] text-sm mt-1 truncate">📍 {ev.location}</p>
                        )}
                        {ev.source_email_subject && (
                          <p className="text-[#66667a] text-xs mt-1 truncate">
                            Via : {ev.source_email_subject}
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
