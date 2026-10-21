import { describe, expect, it } from "vitest";
import {
  applySequence,
  emptySequences,
  nextSequenceValue,
  prepareSequence,
  toggleSequence,
  type SequenceState,
} from "./sequencing";

const bothEnabled = (): SequenceState => ({
  su: { enabled: true, message: "" },
  nib: { enabled: true, message: "" },
});

describe("Saran urutan NIB dan nomor SU", () => {
  it("mempertahankan lebar dan nol awal SU tanpa mengubahnya menjadi Number", () => {
    expect(nextSequenceValue("su", "SU 040")).toBe("SU 041");
    expect(nextSequenceValue("su", "SU 40")).toBe("SU 41");
    expect(nextSequenceValue("su", "SU 0099")).toBe("SU 0100");
    expect(nextSequenceValue("su", "SU 999")).toBe("SU 1000");
    expect(nextSequenceValue("su", "SU 9007199254740992")).toBe(
      "SU 9007199254740993",
    );
  });

  it("hanya menaikkan segmen NIB terakhir, termasuk untuk angka panjang", () => {
    expect(nextSequenceValue("nib", "31.05.04.07.00009")).toBe(
      "31.05.04.07.00010",
    );
    expect(nextSequenceValue("nib", "001.02.00999")).toBe("001.02.01000");
    expect(nextSequenceValue("nib", "00009")).toBe("00010");
    expect(nextSequenceValue("nib", "31.9007199254740992")).toBe(
      "31.9007199254740993",
    );
  });

  it("menolak format asing dan overflow NIB tanpa menebak awalan atau lebar", () => {
    for (const input of [
      "",
      "31..00009",
      "NIB 31.00009",
      "31.00009 ",
      " 31.00009",
      "31.00009/1",
      "ABC.00009",
      "31.",
    ]) {
      expect(() => nextSequenceValue("nib", input)).toThrow("manual");
    }
    for (const input of [
      "",
      "SU 40/2020",
      "SU A40",
      "SU 1.040",
      "SU -1",
      "SU 1e3",
    ]) {
      expect(() => nextSequenceValue("su", input)).toThrow("manual");
    }
    expect(() => nextSequenceValue("nib", "31.05.99999")).toThrow(
      "melebihi lebar",
    );
    expect(() => nextSequenceValue("nib", "9")).toThrow("melebihi lebar");
  });

  it("pengaktifan memakai nilai saat ini dan pematian mempertahankan saran di draf", () => {
    const off = emptySequences().nib;
    expect(toggleSequence(off, "nib", "")).toMatchObject({
      enabled: false,
      message: expect.stringContaining("manual"),
    });
    const enabled = toggleSequence(off, "nib", "31.00009");
    expect(enabled.enabled).toBe(true);
    expect(
      toggleSequence({ ...enabled, suggested: "31.00010" }, "nib", "31.00010"),
    ).toMatchObject({ enabled: false, suggested: "31.00010" });
  });

  it("menghitung masing-masing kolom yang aktif dari nilai hasil simpan terbaru", () => {
    const state = bothEnabled();
    const source = { su: "SU 040", nib: "31.05.04.07.00009" };
    const plan = prepareSequence(state, source);
    expect(plan.values).toEqual({ su: "SU 041", nib: "31.05.04.07.00010" });
    const corrected = prepareSequence(plan.state, {
      su: "SU 085",
      nib: "31.05.04.07.00077",
    });
    expect(corrected.values).toEqual({
      su: "SU 086",
      nib: "31.05.04.07.00078",
    });
    const single = prepareSequence(
      { ...state, su: { enabled: false, message: "" } },
      source,
    );
    expect(single.values).toEqual({ nib: "31.05.04.07.00010" });
    expect(source).toEqual({ su: "SU 040", nib: "31.05.04.07.00009" });
  });

  it("format tidak valid menghentikan hanya satu kolom", () => {
    const plan = prepareSequence(bothEnabled(), {
      su: "SU 040",
      nib: "31.99999",
    });
    expect(plan.state.nib.enabled).toBe(false);
    expect(plan.state.nib.message).toContain("melebihi lebar");
    expect(plan.state.su.enabled).toBe(true);
    expect(plan.values).toEqual({ su: "SU 041" });
  });

  it("nilai tujuan yang terisi menghentikan kolom tersebut, termasuk nilai yang sama dengan saran", () => {
    const plan = prepareSequence(bothEnabled(), {
      su: "SU 040",
      nib: "31.00009",
    });
    const target = { su: "SU 041", nib: "" };
    const applied = applySequence(plan, target);
    expect(applied.values).toEqual({ nib: "31.00010" });
    expect(applied.state.su.enabled).toBe(false);
    expect(applied.state.su.message).toContain("sudah terisi (SU 041)");
    expect(applied.state.nib).toMatchObject({
      enabled: true,
      suggested: "31.00010",
    });
    expect(target).toEqual({ su: "SU 041", nib: "" });
    expect(plan.state.su.enabled).toBe(true);
    expect(applySequence(plan, { su: "", nib: " " }).state.nib.enabled).toBe(
      false,
    );
  });

  it("saat nonaktif tidak menyiapkan saran meskipun ada nilai acuan", () => {
    expect(
      prepareSequence(emptySequences(), { su: "SU 040", nib: "31.00009" })
        .values,
    ).toEqual({});
  });
});
