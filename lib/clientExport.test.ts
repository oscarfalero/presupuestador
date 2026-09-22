import { describe, expect, it } from "vitest";
import { createBudget, type Budget } from "./budget-types";
import { toClientBudget } from "./clientExport";

const SECRET_NOTE = "SECRET-NOTE-9f8a2c";
const SECRET_URL = "https://secret-supplier.example/internal-price";

function budgetWithBreakdown(): Budget {
  const chapter = { id: "ch-1", order: 0, title: "Masonry" };
  return createBudget({
    name: "Test budget",
    clientName: "Client",
    date: "2026-01-01",
    ivaPct: 21,
    chapters: [chapter],
    items: [
      {
        id: "it-1",
        chapterId: chapter.id,
        order: 0,
        code: "1.1",
        title: "Install shower screen",
        description: "Desc",
        um: "ud",
        quantity: 2,
        price: 450,
        breakdown: {
          materials: [
            {
              id: "m-1",
              description: "SECRET-MATERIAL-77",
              quantity: 1,
              price: 289,
              sourceLabel: "SECRET-SUPPLIER",
              sourceUrl: SECRET_URL,
            },
          ],
          labor: { hours: 4, ratePerHour: 35 },
          otherCost: 21,
          notes: SECRET_NOTE,
        },
      },
    ],
  });
}

describe("toClientBudget", () => {
  it("maps chapters, items and totals without loss", () => {
    const client = toClientBudget(budgetWithBreakdown());
    expect(client.chapters).toHaveLength(1);
    expect(client.chapters[0].items).toHaveLength(1);
    expect(client.chapters[0].items[0]).toMatchObject({
      code: "1.1",
      title: "Install shower screen",
      quantity: 2,
      price: 450,
      amount: 900,
    });
    expect(client.subtotal).toBe(900);
    expect(client.vatAmount).toBe(189);
    expect(client.total).toBe(1089);
  });

  it("maps header data and document sections", () => {
    const base = budgetWithBreakdown();
    const client = toClientBudget({
      ...base,
      number: "2026-007",
      address: "Calle Falsa 123\nMadrid",
      intro: "Intro text",
      terms: "Terms text",
      payment: "Cash",
    });
    expect(client).toMatchObject({
      number: "2026-007",
      address: "Calle Falsa 123\nMadrid",
      intro: "Intro text",
      terms: "Terms text",
      payment: "Cash",
    });
  });

  it("never leaks the internal breakdown (regression check for client exports)", () => {
    const client = toClientBudget(budgetWithBreakdown());
    const serialized = JSON.stringify(client);
    // Both the Excel and PDF exports are built exclusively from this model,
    // so anything absent here cannot reach the client.
    expect(serialized).not.toContain("breakdown");
    expect(serialized).not.toContain("SECRET-MATERIAL-77");
    expect(serialized).not.toContain("SECRET-SUPPLIER");
    expect(serialized).not.toContain(SECRET_URL);
    expect(serialized).not.toContain(SECRET_NOTE);
    expect(serialized).not.toContain("ratePerHour");
    expect(serialized).not.toContain("otherCost");
  });
});
