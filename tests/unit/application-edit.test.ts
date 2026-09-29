import { describe, expect, it } from "vitest";

import {
  applicationEditSchema,
  diffApplication,
  toApplicationValues,
} from "@/lib/admin/application-edit";

const base = {
  name: "Dr. Rahim Uddin",
  phone: "01711223344",
  courseId: "course-1",
};

describe("application correction", () => {
  it("applies the public form's rules", () => {
    expect(applicationEditSchema.safeParse(base).success).toBe(true);
    const bad = applicationEditSchema.safeParse({
      ...base,
      phone: "12345",
      nationalId: "123",
    });
    expect(bad.success).toBe(false);
    const paths = bad.error!.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["phone", "nationalId"]));
  });

  it("allows an enquiry without a course", () => {
    expect(applicationEditSchema.safeParse({ ...base, courseId: "" }).success).toBe(
      true,
    );
  });

  it("normalises phones and turns blanks into null", () => {
    const values = toApplicationValues(
      applicationEditSchema.parse({ ...base, email: "", whatsapp: "01778838644" }),
    );
    expect(values.phone).toBe("+8801711223344");
    expect(values.whatsapp).toBe("+8801778838644");
    expect(values.email).toBeNull();
    expect(values.education).toBeNull();
  });

  it("records only what changed, old and new", () => {
    const after = toApplicationValues(
      applicationEditSchema.parse({
        ...base,
        name: "Dr. Rahim Uddin Ahmed",
        dateOfBirth: "1995-04-12",
      }),
    );
    const changes = diffApplication(
      {
        name: "Dr. Rahim Uddin",
        phone: "+8801711223344",
        courseId: "course-1",
        dateOfBirth: new Date("1995-04-12T00:00:00Z"),
        email: "",
      },
      after,
    );
    expect(changes).toEqual({
      name: { from: "Dr. Rahim Uddin", to: "Dr. Rahim Uddin Ahmed" },
    });
  });
});
