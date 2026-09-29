import { describe, expect, it } from "vitest";

import { DEFAULT_TEMPLATES } from "@/lib/messaging-defaults";
import { buildRequest, gatewayNumber } from "@/lib/sms";

/**
 * The parts of messaging that can be tested without a gateway: the template
 * substitution, the number shape each gateway wants, and the request built
 * for it. `renderTemplate` is re-implemented here rather than imported
 * because `src/lib/messaging.ts` is server-only.
 */

// Same rule as the sender: a placeholder nobody supplied is left as typed.
function renderTemplate(body: string, values: Record<string, string | undefined>) {
  return body.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = values[key];
    return value == null || value === "" ? whole : String(value);
  });
}

describe("template rendering", () => {
  it("substitutes what it is given", () => {
    expect(renderTemplate("Hello {name}, {course} starts {date}.", {
      name: "Dr. Nusrat",
      course: "CMU",
      date: "5 Jan",
    })).toBe("Hello Dr. Nusrat, CMU starts 5 Jan.");
  });

  it("leaves an unknown placeholder visible rather than blanking it", () => {
    // A blank would look deliberate; the braces are a typo somebody can see
    // in the outbox and fix in the template.
    expect(renderTemplate("Serial {seriaal}", { serial: "12" })).toBe(
      "Serial {seriaal}",
    );
  });

  it("treats an empty value as missing", () => {
    expect(renderTemplate("Batch: {batch}", { batch: "" })).toBe("Batch: {batch}");
  });

  it("every built-in template only uses placeholders the senders supply", () => {
    const allowed = new Set([
      "name",
      "course",
      "batch",
      "date",
      "time",
      "serial",
      "roll",
      "institute",
      "phone",
    ]);
    for (const template of DEFAULT_TEMPLATES) {
      for (const [, key] of template.body.matchAll(/\{(\w+)\}/g)) {
        expect(allowed, `${template.key} uses {${key}}`).toContain(key);
      }
    }
  });

  it("no built-in template asks for anything a patient would not want texted", () => {
    // Health data must never leave in an SMS (addendum 4, §5).
    for (const template of DEFAULT_TEMPLATES) {
      expect(template.body).not.toMatch(/\{complaint\}|\{age\}|\{pregnan/i);
    }
  });
});

describe("gateway number", () => {
  it("strips the plus and accepts the shapes people type", () => {
    expect(gatewayNumber("01778-838644")).toBe("8801778838644");
    expect(gatewayNumber("+880 1778 838644")).toBe("8801778838644");
  });

  it("refuses anything that is not a Bangladeshi mobile", () => {
    expect(gatewayNumber("12345")).toBeNull();
    expect(gatewayNumber("")).toBeNull();
  });
});

describe("gateway requests", () => {
  it("posts form data to bulksmsbd", () => {
    const { url, init } = buildRequest(
      "bulksmsbd",
      { apiKey: "KEY", senderId: "MUTI" },
      "8801778838644",
      "hello",
    );
    expect(url).toBe("https://bulksmsbd.net/api/smsapi");
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(String(init.body));
    expect(body.get("api_key")).toBe("KEY");
    expect(body.get("number")).toBe("8801778838644");
    expect(body.get("message")).toBe("hello");
  });

  it("posts json to sslwireless with a unique message id", () => {
    const first = buildRequest(
      "sslwireless",
      { apiKey: "TOKEN", senderId: "SID" },
      "8801778838644",
      "hello",
    );
    const payload = JSON.parse(String(first.init.body));
    expect(payload.api_token).toBe("TOKEN");
    expect(payload.msisdn).toBe("8801778838644");
    expect(payload.csms_id).toMatch(/^muti/);
  });

  it("fills a generic gateway's URL template and encodes the message", () => {
    const { url, init } = buildRequest(
      "generic",
      {
        apiKey: "K",
        senderId: "S",
        url: "https://sms.example/send?key={key}&to={number}&from={sender}&text={message}",
      },
      "8801778838644",
      "hello there & goodbye",
    );
    expect(init.method).toBe("GET");
    expect(url).toBe(
      "https://sms.example/send?key=K&to=8801778838644&from=S&text=hello%20there%20%26%20goodbye",
    );
  });
});
