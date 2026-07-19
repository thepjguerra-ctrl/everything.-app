// EVERYTHING. — Quick-capture parser self-test (dev tool)
//
// HOW TO RUN:
//   1. Open index.html in your browser.
//   2. Open the browser console (Cmd+Opt+J / F12).
//   3. Paste this entire file into the console and press Enter.
//   4. Call runQuickCaptureParserTests()  →  prints a PASS/FAIL table and
//      returns true when every check passes.
//
// This relies on the app's parser functions (parseCaptureEntries, preSplitDump,
// resolveToDate, pinDayLabel) being in scope when you run it, so run it against
// the live app rather than in isolation. The fixtures below use throwaway names.

function runQuickCaptureParserTests() {
    const input = "Call with Ranin on Thursday for Preproduction, Friday shoot from 6-10pm w/ Bryan, Wednesday shoot for Pascal , Tuesday 6:30 call with Kaitlin’s and Malcom";
    const staged = parseCaptureEntries([{ text: preSplitDump(input), srcDumpId: null }], () => null);
    const results = [];
    const check = (name, pass) => results.push({ test: name, result: pass ? "PASS" : "FAIL" });
    const [a, b, c, d] = staged;
    check("splits into exactly 4 items", staged.length === 4);
    check("all items routed to Calendar", staged.length > 0 && staged.every(s => s.dest === "calendar"));
    check("1: title 'Call with Ranin'", !!a && a.label === "Call with Ranin");
    check("1: day Thursday", !!a && a.calDay === "Thursday");
    check("1: time blank", !!a && !a.calTime);
    check("1: notes mention Preproduction", !!a && /preproduction/i.test(a.calNotes || ""));
    check("2: title 'Shoot w/ Bryan'", !!b && b.label === "Shoot w/ Bryan");
    check("2: day Friday", !!b && b.calDay === "Friday");
    check("2: time keeps 6-10pm", !!b && /6\s*[-–]\s*10\s*pm/i.test(b.calTime || ""));
    check("3: title 'Shoot for Pascal'", !!c && c.label === "Shoot for Pascal");
    check("3: day Wednesday", !!c && c.calDay === "Wednesday");
    check("3: time blank", !!c && !c.calTime);
    check("4: title 'Call with Kaitlin and Malcom'", !!d && d.label === "Call with Kaitlin and Malcom");
    check("4: day Tuesday", !!d && d.calDay === "Tuesday");
    check("4: time keeps 6:30", !!d && /6:30/.test(d.calTime || ""));
    // ── Routing: deadlines vs events, people, ideas, waiting-on ──────────────
    const staged2 = parseCaptureEntries([{ text: "Submit the invoice by Friday\nText Blake back\nWhat if I did a rooftop shoot at sunset\nWaiting on Sarah to send the contract", srcDumpId: null }], () => null);
    const [e2, f2, g2, h2] = staged2;
    check("deadline 'by Friday' routes to a task, NOT calendar", !!e2 && e2.dest === "today");
    check("deadline keeps its day for the due-date note", !!e2 && e2.calDay === "Friday");
    check("deadline label drops the dangling 'by'", !!e2 && e2.label === "Submit the invoice");
    check("'Text Blake back' → People", !!f2 && f2.dest === "people");
    check("'What if…' → Ideas Notebook", !!g2 && g2.dest === "ideas");
    check("'Waiting on Sarah…' → Waiting On", !!h2 && h2.dest === "waitingOn");
    // ── Calendar drift: the day-of jump-a-week bug ────────────────────────────
    const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
    const sameDay = resolveToDate(todayName);
    check("today's weekday name resolves to TODAY (not next week)", sameDay.length === 1 && sameDay[0].toDateString() === new Date().toDateString());
    const pinned = pinDayLabel(todayName);
    check("pinDayLabel pins a weekday to a fixed ISO date", /^\d{4}-\d{2}-\d{2}$/.test(pinned || ""));
    check("pinned date still resolves to one day", resolveToDate(pinned).length === 1);
    check("pinDayLabel leaves 'Upcoming' untouched", pinDayLabel("Upcoming") === "Upcoming");
    check("pinDayLabel pins day ranges to ISO range", /^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/.test(pinDayLabel("Monday to Friday") || ""));
    console.table(results);
    console.log("Staged items:", staged);
    if (typeof window !== "undefined")
        window.__qcLastStaged = staged;
    return results.every(r => r.result === "PASS");
}
if (typeof window !== "undefined")
    window.__qcParserTest = runQuickCaptureParserTests;
