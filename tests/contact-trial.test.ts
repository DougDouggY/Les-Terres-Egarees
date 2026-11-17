import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactScenarios,
  contactSample,
  contactDuration,
  type ContactScenario,
} from "../src/ui/contact-trial-model";
test("essai au contact : les quatre échanges imposés conservent ordre, parades, esquives et PV", () => {
  const expectations = {
    agility: [20, 16],
    parry: [24, 16],
    "double-parry": [24, 12],
    dodges: [24, 0],
  };
  for (const id of Object.keys(expectations) as ContactScenario[]) {
    const s = contactSample(id, contactDuration(id));
    assert.deepEqual(s.hp, expectations[id]);
    assert.equal(s.applied.length, contactScenarios[id].events.length);
    assert.equal(s.done, true);
    assert.equal(contactSample(id, 0).approach, 0);
    assert.deepEqual(contactSample(id, 0).hp, [24, 24]);
  }
  assert.deepEqual(
    contactScenarios["double-parry"].events.map((e) => [e.side, e.outcome]),
    [
      [1, "block"],
      [0, "hit"],
      [0, "hit"],
      [1, "block"],
      [0, "hit"],
    ],
  );
  assert.deepEqual(
    contactScenarios.dodges.events.map((e) => e.outcome),
    ["evade", "evade", "hit"],
  );
});
