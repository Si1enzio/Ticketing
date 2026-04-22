import path from "node:path";
import { readFile } from "node:fs/promises";

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createElement as h } from "react";

import { generateTicketQrDataUrl } from "@/lib/security/tickets";
import { getTicketByCode, getViewerContext } from "@/lib/supabase/queries";

const geistFontPath = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "@vercel",
  "og",
  "Geist-Regular.ttf",
);

const geistFontDataPromise = readFile(geistFontPath);

function formatTicketDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderField({
  label,
  value,
  priority = false,
}: {
  label: string;
  value: string;
  priority?: boolean;
}) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
        minHeight: 126,
        padding: "18px 20px",
        borderRadius: 24,
        border: priority ? "2px solid #fecaca" : "1px solid #e5e7eb",
        background: priority ? "#fff7f7" : "#fafafa",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: 19,
          textTransform: "uppercase",
          letterSpacing: 3,
          color: "#6b7280",
        },
      },
      label,
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: priority ? 34 : 28,
          lineHeight: 1.2,
          color: "#111111",
          fontWeight: priority ? 700 : 500,
        },
      },
      value,
    ),
  );
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/bilete/[ticketCode]/image">,
) {
  const { ticketCode } = await context.params;
  const viewer = await getViewerContext();
  const ticket = await getTicketByCode(ticketCode, viewer);

  if (!ticket) {
    return new Response("Bilet inexistent.", { status: 404 });
  }

  const qrDataUrl = await generateTicketQrDataUrl({
    code: ticket.ticketCode,
    matchId: ticket.matchId,
    version: ticket.qrTokenVersion,
    kind: "ticket",
  });
  const fontData = await geistFontDataPromise;

  const statusLabel =
    ticket.status === "used"
      ? "Folosit"
      : ticket.status === "blocked"
        ? "Blocat"
        : ticket.status === "canceled"
          ? "Anulat"
          : "Activ";

  const image = new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 30,
          background: "#f5f5f5",
          color: "#111111",
          fontFamily: "GeistTicket",
        },
      },
      h(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRadius: 36,
            overflow: "hidden",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          },
        },
        h("div", {
          style: {
            height: 12,
            width: "100%",
            background: "#dc2626",
          },
        }),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              padding: "28px 28px 20px",
              background: "#111111",
              color: "#ffffff",
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 22,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#fecaca",
                marginBottom: 10,
              },
            },
            "Stadionul Municipal Orhei",
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 52,
                lineHeight: 1.05,
                textTransform: "uppercase",
              },
            },
            ticket.matchTitle,
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                marginTop: 12,
                fontSize: 24,
                color: "#e5e7eb",
              },
            },
            ticket.competitionName,
          ),
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 22,
              padding: 28,
              flex: 1,
              background: "#ffffff",
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                width: "100%",
                gap: 16,
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  width: "100%",
                  padding: "22px 18px 18px",
                  borderRadius: 28,
                  border: "2px solid #d1d5db",
                  background: "#ffffff",
                },
              },
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    fontSize: 24,
                    textTransform: "uppercase",
                    letterSpacing: 4,
                    color: "#7f1d1d",
                  },
                },
                "QR unic de acces",
              ),
              h("img", {
                src: qrDataUrl,
                alt: `QR pentru biletul ${ticket.ticketCode}`,
                width: 420,
                height: 420,
                style: {
                  width: 420,
                  height: 420,
                  background: "#ffffff",
                  padding: 14,
                  borderRadius: 26,
                  border: "1px solid #e5e7eb",
                },
              }),
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  },
                },
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontSize: 22,
                      textTransform: "uppercase",
                      letterSpacing: 4,
                      color: "#6b7280",
                    },
                  },
                  "Cod bilet",
                ),
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontSize: 48,
                      fontWeight: 700,
                      color: "#111111",
                    },
                  },
                  ticket.ticketCode,
                ),
              ),
            ),
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 16,
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 16,
                },
              },
              renderField({
                label: "Titular",
                value: ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter",
              }),
              renderField({
                label: "Data si ora",
                value: formatTicketDate(ticket.startsAt),
              }),
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 16,
                },
              },
              renderField({
                label: "Stadion",
                value: ticket.stadiumName,
              }),
              renderField({
                label: "Poarta",
                value: ticket.gateName ?? "Fara poarta alocata",
              }),
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 16,
                },
              },
              renderField({
                label: "Sector",
                value: ticket.sectorName,
                priority: true,
              }),
              renderField({
                label: "Rand",
                value: ticket.rowLabel,
                priority: true,
              }),
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 16,
                },
              },
              renderField({
                label: "Loc",
                value: String(ticket.seatNumber),
                priority: true,
              }),
              renderField({
                label: "Status",
                value: statusLabel,
              }),
            ),
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                width: "100%",
                padding: "18px 20px",
                borderRadius: 24,
                background: "#fff1f2",
                color: "#991b1b",
                fontSize: 24,
                lineHeight: 1.35,
              },
            },
            "Pastreaza aceasta imagine salvata in telefon pentru acces rapid la stadion chiar si daca semnalul este slab. Pentru scanare reusita, afiseaza QR-ul la luminozitate mare.",
          ),
        ),
      ),
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        {
          name: "GeistTicket",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );

  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";
  const headers = new Headers(image.headers);
  headers.set("Content-Type", "image/png");
  headers.set(
    "Content-Disposition",
    `${shouldDownload ? "attachment" : "inline"}; filename="${ticket.ticketCode}.png"`,
  );

  return new Response(image.body, {
    status: image.status,
    statusText: image.statusText,
    headers,
  });
}
