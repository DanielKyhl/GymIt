import { live, mergeRecords, SyncRecord, upsert } from "../syncMerge";

type Note = SyncRecord & { text: string };
const note = (id: string, updatedAt: number, text: string, deleted?: boolean): Note => ({
  id,
  updatedAt,
  text,
  ...(deleted ? { deleted } : {}),
});

describe("mergeRecords", () => {
  test("the most recent edit wins, whichever side it came from", () => {
    const local = [note("a", 100, "phone edit"), note("b", 300, "phone newer")];
    const remote = [note("a", 200, "web edit"), note("b", 250, "web older")];
    expect(mergeRecords(local, remote)).toEqual([
      note("a", 200, "web edit"),
      note("b", 300, "phone newer"),
    ]);
  });

  test("keeps local order and appends records only the cloud has", () => {
    const local = [note("b", 1, "b"), note("a", 1, "a")];
    const remote = [note("c", 1, "c")];
    expect(mergeRecords(local, remote).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  test("a tie keeps the local copy", () => {
    expect(mergeRecords([note("a", 5, "mine")], [note("a", 5, "theirs")])).toEqual([
      note("a", 5, "mine"),
    ]);
  });

  test("a newer deletion from another device removes the record", () => {
    const merged = mergeRecords([note("a", 100, "still here")], [note("a", 200, "", true)]);
    expect(live(merged)).toEqual([]);
  });

  test("an edit made after a deletion brings the record back", () => {
    const merged = mergeRecords([note("a", 300, "edited later")], [note("a", 200, "", true)]);
    expect(live(merged)).toEqual([note("a", 300, "edited later")]);
  });

  test("merging is repeatable: syncing twice changes nothing", () => {
    const local = [note("a", 1, "a")];
    const remote = [note("a", 2, "a2"), note("b", 1, "b")];
    const once = mergeRecords(local, remote);
    expect(mergeRecords(once, remote)).toEqual(once);
  });
});

describe("upsert", () => {
  test("replaces in place", () => {
    const list = [note("a", 1, "a"), note("b", 1, "b")];
    expect(upsert(list, note("a", 2, "A")).map((r) => r.text)).toEqual(["A", "b"]);
  });

  test("appends new records, or prepends when asked", () => {
    const list = [note("a", 1, "a")];
    expect(upsert(list, note("z", 1, "z")).map((r) => r.id)).toEqual(["a", "z"]);
    expect(upsert(list, note("z", 1, "z"), true).map((r) => r.id)).toEqual(["z", "a"]);
  });

  test("does not mutate the list it was given", () => {
    const list = [note("a", 1, "a")];
    upsert(list, note("a", 2, "A"));
    expect(list).toEqual([note("a", 1, "a")]);
  });
});
