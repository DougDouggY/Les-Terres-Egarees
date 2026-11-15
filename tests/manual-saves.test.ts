import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine";
import { ManualSaves, manualSaveKey } from "../src/game/manual-saves";
function setup() {
  const data = new Map<string, string>(),
    writes: string[] = [];
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      writes.push(k);
      data.set(k, v);
    },
  };
  return { data, writes, store: new ManualSaves(storage) };
}
test("sauvegardes manuelles : noms, emplacements indépendants, chargement sans écriture, essais non sauvegardés perdus", () => {
  const { data, writes, store } = setup(),
    s = E.createCampaign(["north", "knight"]);
  const legacy = E.encode(s);
  data.set("lte-save", legacy);
  assert.deepEqual(store.list(), []);
  assert.equal(writes.length, 0);
  const official = store.create("Officielle", s),
    other = store.create("Essai", s),
    raw = data.get(manualSaveKey)!;
  const baseline = JSON.parse(official.payload),
    loaded = store.load(official.id);
  assert.equal(writes.length, 2);
  loaded.units[0].hp = 1;
  loaded.inventory.push({ name: "Test", count: 7 });
  for (let i = 0; i < 4; i++) E.advance(loaded);
  loaded.common.round += 5;
  loaded.seed += 23;
  assert.equal(data.get(manualSaveKey), raw);
  const reopened = new ManualSaves({
    getItem: (k) => data.get(k) ?? null,
    setItem: () => {
      throw Error("Un chargement ne doit jamais écrire");
    },
  }).load(official.id);
  assert.deepEqual(JSON.parse(E.encode(reopened)), baseline);
  assert.equal(data.get("lte-save"), legacy);
  store.rename(other.id, "Brouillon");
  assert.equal(store.list()[1].name, "Brouillon");
  assert.equal(store.list()[0].payload, official.payload);
  assert.throws(() => store.overwrite(official.id, loaded, false));
  assert.throws(() => store.delete(official.id, false));
  store.overwrite(other.id, loaded, true);
  assert.equal(store.load(other.id).units[0].hp, 1);
  assert.equal(store.list()[0].payload, official.payload);
  store.delete(other.id, true);
  assert.equal(store.list().length, 1);
  assert.equal(store.list()[0].id, official.id);
});
test("sauvegardes : format futur et quota ne détruisent ni catalogue ni ancienne sauvegarde", () => {
  const { data, store } = setup();
  data.set(manualSaveKey, JSON.stringify({ version: 9, slots: [] }));
  assert.throws(() => store.list(), /Format/);
  const raw = data.get(manualSaveKey);
  assert.throws(() =>
    store.create("test", E.createCampaign(["north", "knight"])),
  );
  assert.equal(data.get(manualSaveKey), raw);
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw Error("QuotaExceededError");
    },
  };
  assert.throws(
    () =>
      new ManualSaves(storage).create(
        "test",
        E.createCampaign(["north", "knight"]),
      ),
    /Quota/,
  );
});
test("capitaine : Aldric confirmé, casque distinct et migration sans réattribution de portrait", () => {
  const s = E.createCampaign(["north", "knight"]);
  E.beginForestChapter(s);
  const c = s.units.find((u) => u.id === "valdren-captain")!,
    soldier = s.units.find((u) => u.id === "valdren-1")!;
  assert.equal(c.name, "Capitaine Aldric");
  assert.equal(c.hasPersonalName, true);
  assert.equal(c.portraitId, "N04");
  assert.equal(soldier.portraitId, "N03");
  c.name = "Capitaine de Valdren";
  c.hasPersonalName = false;
  const payload = E.encode(s),
    restored = E.decode(payload),
    captain = restored.units.find((u) => u.id === c.id)!;
  assert.equal(captain.name, "Capitaine Aldric");
  assert.equal(captain.portraitId, c.portraitId);
  assert.equal(
    JSON.parse(payload).units.find((u: any) => u.id === c.id).name,
    "Capitaine de Valdren",
  );
});
