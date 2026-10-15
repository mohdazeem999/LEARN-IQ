/**
 * Input validation utilities for LearnIQ backend
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks if a value is a valid UUID string.
 * @param {any} value
 * @returns {boolean}
 */
function isValidUUID(value) {
    return typeof value === "string" && UUID_REGEX.test(value.trim());
}

module.exports = {
    isValidUUID,
    UUID_REGEX
};
