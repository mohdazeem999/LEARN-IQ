const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidUUID } = require("../utils/validators");

test("isValidUUID correctly identifies valid RFC 4122 UUIDs", () => {
    assert.equal(isValidUUID("c0a80101-0000-4000-a000-000000000001"), true);
    assert.equal(isValidUUID("550e8400-e29b-41d4-a716-446655440000"), true);
    assert.equal(isValidUUID("d9428888-122b-11d8-9a45-003065d3608e"), true);
});

test("isValidUUID blocks SQL/PostgREST injection attempts and invalid formats", () => {
    assert.equal(isValidUUID("12345"), false);
    assert.equal(isValidUUID("not-a-uuid"), false);
    assert.equal(isValidUUID("user_id.eq.admin"), false);
    assert.equal(isValidUUID("123e4567-e89b-12d3-a456-426614174000,role.eq.admin"), false);
    assert.equal(isValidUUID("'; DROP TABLE profiles; --"), false);
    assert.equal(isValidUUID(null), false);
    assert.equal(isValidUUID(undefined), false);
    assert.equal(isValidUUID({}), false);
    assert.equal(isValidUUID(12345), false);
});
