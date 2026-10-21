process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import test from "node:test";
import { analysesStore, DEFAULT_MAX_RAM_CACHE_SIZE, DEFAULT_MAX_USER_HISTORY_LIMIT } from "../api/store.js";

test("Analysis Store: RAM LRU Caching and Per-User History Quota Suite", async (t) => {
  t.beforeEach(() => {
    analysesStore.clear();
    analysesStore.setLimits({
      ramCacheSize: DEFAULT_MAX_RAM_CACHE_SIZE,
      userHistoryLimit: DEFAULT_MAX_USER_HISTORY_LIMIT,
    });
  });

  t.afterEach(() => {
    analysesStore.clear();
    analysesStore.setLimits({
      ramCacheSize: DEFAULT_MAX_RAM_CACHE_SIZE,
      userHistoryLimit: DEFAULT_MAX_USER_HISTORY_LIMIT,
    });
  });

  await t.test("RAM LRU Cache evicts oldest item when maxRamCacheSize is reached", async () => {
    analysesStore.setLimits({ ramCacheSize: 3 });

    await analysesStore.save("item_1", { title: "Item 1" });
    await analysesStore.save("item_2", { title: "Item 2" });
    await analysesStore.save("item_3", { title: "Item 3" });

    assert.strictEqual(analysesStore.size(), 3, "Cache should have 3 items");
    assert.ok(await analysesStore.get("item_1"), "Item 1 should be present");

    // Saving 4th item should evict the oldest (item_2, since item_1 was recently accessed via get)
    await analysesStore.save("item_4", { title: "Item 4" });

    assert.strictEqual(analysesStore.size(), 3, "Cache size must be capped at 3");
    assert.ok(await analysesStore.get("item_1"), "Item 1 should still be present because it was refreshed");
    assert.strictEqual(await analysesStore.get("item_2"), null, "Item 2 should have been evicted by LRU");
    assert.ok(await analysesStore.get("item_3"), "Item 3 should be present");
    assert.ok(await analysesStore.get("item_4"), "Item 4 should be present");
  });

  await t.test("Per-User Quota evicts oldest unpinned item for that user", async () => {
    analysesStore.setLimits({ userHistoryLimit: 2 });
    const userAlice = "user_alice_123";
    const userBob = "user_bob_456";

    // Alice saves 2 unpinned analyses
    await analysesStore.save("alice_1", { title: "Alice First", isPinned: false }, userAlice);
    // Slight pause to guarantee distinct createdAt timestamps
    await new Promise((r) => setTimeout(r, 10));
    await analysesStore.save("alice_2", { title: "Alice Second", isPinned: false }, userAlice);

    // Bob saves 1 analysis
    await analysesStore.save("bob_1", { title: "Bob First" }, userBob);

    let aliceList = await analysesStore.listByUser(userAlice);
    assert.strictEqual(aliceList.total, 2, "Alice should have 2 items");

    // Alice saves 3rd unpinned analysis -> oldest unpinned (alice_1) should be evicted
    await new Promise((r) => setTimeout(r, 10));
    await analysesStore.save("alice_3", { title: "Alice Third", isPinned: false }, userAlice);

    aliceList = await analysesStore.listByUser(userAlice);
    assert.strictEqual(aliceList.total, 2, "Alice's count must remain capped at 2");
    const aliceIds = aliceList.analyses.map((a) => a.analysisId);
    assert.ok(!aliceIds.includes("alice_1"), "Oldest analysis (alice_1) must be removed");
    assert.ok(aliceIds.includes("alice_2"), "alice_2 must remain");
    assert.ok(aliceIds.includes("alice_3"), "alice_3 must be present");

    // Verify Bob's items are isolated and untouched
    const bobList = await analysesStore.listByUser(userBob);
    assert.strictEqual(bobList.total, 1, "Bob's quota must remain isolated and unaffected");
    assert.strictEqual(bobList.analyses[0].analysisId, "bob_1");
  });

  await t.test("Per-User Quota protects PINNED analyses from being evicted", async () => {
    analysesStore.setLimits({ userHistoryLimit: 2 });
    const userAlice = "user_alice_pinned";

    // Alice saves 1 PINNED analysis and 1 unpinned
    await analysesStore.save("pinned_1", { title: "Important Audit", isPinned: true }, userAlice);
    await new Promise((r) => setTimeout(r, 10));
    await analysesStore.save("unpinned_2", { title: "Quick Check", isPinned: false }, userAlice);

    // Alice saves 3rd analysis -> unpinned_2 should be evicted, but pinned_1 MUST be preserved!
    await new Promise((r) => setTimeout(r, 10));
    await analysesStore.save("unpinned_3", { title: "New Check", isPinned: false }, userAlice);

    const aliceList = await analysesStore.listByUser(userAlice);
    const aliceIds = aliceList.analyses.map((a) => a.analysisId);

    assert.ok(aliceIds.includes("pinned_1"), "Pinned analysis must NEVER be auto-evicted by quota");
    assert.ok(aliceIds.includes("unpinned_3"), "New analysis must be saved");
    assert.ok(!aliceIds.includes("unpinned_2"), "Oldest unpinned analysis should be evicted");
  });
});
