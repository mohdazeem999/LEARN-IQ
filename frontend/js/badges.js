/**
 * LearnIQ - Reusable Badge Component & Data Helper
 * Strict Scope: Medals, Top Bar Chip/Avatar, Rankings Icons, Profile Shelf, Achievements Switch
 */

(function () {
    // -------------------------------------------------------------------------
    // 1. REWARD DEFINITIONS (Colors & Icons)
    // -------------------------------------------------------------------------
    const BADGE_CONFIG = {
        "scholar-badge": {
            id: "scholar-badge",
            name: "Scholar Badge",
            icon: "fa-solid fa-medal",
            color: "#38d6ff"
        },
        "learning-rocket": {
            id: "learning-rocket",
            name: "Learning Rocket",
            icon: "fa-solid fa-rocket",
            color: "#9a8cff"
        },
        "master-crown": {
            id: "master-crown",
            name: "Master Crown",
            icon: "fa-solid fa-crown",
            color: "#f5c451"
        },
        "30-day-streak": {
            id: "30-day-streak",
            name: "30 Day Streak",
            icon: "fa-solid fa-fire",
            color: "#ff8a50"
        }
    };

    function resolveBadge(badge) {
        if (!badge) return null;
        const id = String(badge.id || badge.badgeId || badge.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
        for (const key of Object.keys(BADGE_CONFIG)) {
            if (id.includes(key) || key.includes(id)) {
                return { ...BADGE_CONFIG[key], ...badge, color: BADGE_CONFIG[key].color, icon: BADGE_CONFIG[key].icon, name: BADGE_CONFIG[key].name };
            }
        }
        return {
            id: badge.id || "badge",
            name: badge.name || "Badge",
            icon: badge.icon || "fa-solid fa-medal",
            color: badge.color || "#38d6ff",
            ...badge
        };
    }

    // -------------------------------------------------------------------------
    // 2. REUSABLE MEDAL COMPONENT
    // -------------------------------------------------------------------------
    function renderBadgeMedal(rawBadge, size = 30) {
        const badge = resolveBadge(rawBadge);
        if (!badge) return "";
        const accent = badge.color || "#38d6ff";
        const glowRadius = Math.round(size / 2);
        const iconSize = Math.max(10, Math.round(size * 0.46));

        return `
            <div class="badge-medal"
                 data-badge-id="${badge.id}"
                 aria-label="${badge.name}"
                 title="${badge.name}"
                 role="img"
                 style="
                     width: ${size}px;
                     height: ${size}px;
                     border-radius: 50%;
                     background: radial-gradient(circle at 30% 25%, ${accent}66, ${accent}11);
                     border: 1.5px solid ${accent}99;
                     box-shadow: 0 0 ${glowRadius}px ${accent}55;
                     display: inline-flex;
                     align-items: center;
                     justify-content: center;
                     flex-shrink: 0;
                     color: ${accent};
                     font-size: ${iconSize}px;
                     box-sizing: border-box;
                     user-select: none;
                 ">
                 <i class="${badge.icon}" aria-hidden="true"></i>
            </div>
        `;
    }

    function renderUserBadges(badges, options = {}) {
        const { size = 24, max = 3, gap = 5 } = options;
        if (!Array.isArray(badges) || badges.length === 0) return "";

        const visibleBadges = badges.filter(b => b.showOnProfile !== false);
        if (visibleBadges.length === 0) return "";

        const shown = visibleBadges.slice(0, max);
        const remaining = visibleBadges.length - shown.length;

        const medalsHtml = shown.map(b => renderBadgeMedal(b, size)).join("");
        const countHtml = remaining > 0 ? `<span class="badge-more-count" style="font-size: 11px; font-weight: 800; color: #38d6ff; margin-left: 2px;">+${remaining}</span>` : "";

        return `
            <div class="user-badges-row" style="display: inline-flex; align-items: center; gap: ${gap}px;">
                ${medalsHtml}
                ${countHtml}
            </div>
        `;
    }

    // -------------------------------------------------------------------------
    // 3. BADGES DATA HELPER (FETCH & CACHE)
    // -------------------------------------------------------------------------
    let cachedUserBadges = null;
    let isFetching = false;

    async function fetchUserBadges(force = false) {
        if (cachedUserBadges && !force) {
            return cachedUserBadges;
        }
        if (isFetching) return cachedUserBadges || [];
        isFetching = true;

        try {
            const apiBase = window.API_BASE || "/api";
            const res = await fetch(`${apiBase}/students/badges`, { credentials: "same-origin" });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.badges)) {
                    cachedUserBadges = data.badges.map(resolveBadge);
                } else {
                    cachedUserBadges = [];
                }
            } else {
                cachedUserBadges = [];
            }
        } catch (e) {
            console.warn("Could not fetch user badges:", e.message);
            cachedUserBadges = cachedUserBadges || [];
        } finally {
            isFetching = false;
        }

        syncBadgesAcrossUI();
        return cachedUserBadges;
    }

    async function toggleBadgeVisibility(badgeId, showOnProfile) {
        if (!cachedUserBadges) cachedUserBadges = [];
        const target = cachedUserBadges.find(b => b.id === badgeId);
        if (target) {
            target.showOnProfile = Boolean(showOnProfile);
        }

        syncBadgesAcrossUI();

        try {
            const apiBase = window.API_BASE || "/api";
            const res = await fetch(`${apiBase}/students/badges/toggle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ badgeId, showOnProfile })
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.badges)) {
                cachedUserBadges = data.badges.map(resolveBadge);
                syncBadgesAcrossUI();
            }
        } catch (e) {
            console.error("Failed to persist badge visibility toggle:", e.message);
        }
    }

    function recordRedeemedBadge(badgeData) {
        const resolved = resolveBadge(badgeData);
        if (!cachedUserBadges) cachedUserBadges = [];
        const idx = cachedUserBadges.findIndex(b => b.id === resolved.id);
        if (idx >= 0) {
            cachedUserBadges[idx] = { ...cachedUserBadges[idx], ...resolved, showOnProfile: true };
        } else {
            cachedUserBadges.push({ ...resolved, showOnProfile: true });
        }
        syncBadgesAcrossUI();
    }

    // -------------------------------------------------------------------------
    // 4. UI SYNCHRONIZATION
    // -------------------------------------------------------------------------
    function syncBadgesAcrossUI() {
        const badges = cachedUserBadges || [];
        const visibleBadges = badges.filter(b => b.showOnProfile !== false);

        // 1. TOP BAR CHIP & AVATAR MEDAL
        const topbarChip = document.getElementById("topbarBadgeChip");
        const chipMedalSlot = document.getElementById("topbarChipMedal");
        const chipNameSlot = document.getElementById("topbarChipName");
        const chipMoreSlot = document.getElementById("topbarChipMore");
        const avatarMedalSlot = document.getElementById("topbarAvatarMedal");

        if (visibleBadges.length > 0) {
            const firstBadge = visibleBadges[0];

            if (topbarChip && chipMedalSlot && chipNameSlot) {
                chipMedalSlot.innerHTML = renderBadgeMedal(firstBadge, 30);
                chipNameSlot.textContent = firstBadge.name;

                if (visibleBadges.length > 1) {
                    chipMoreSlot.textContent = `+${visibleBadges.length - 1}`;
                    chipMoreSlot.style.display = "inline";
                } else {
                    chipMoreSlot.style.display = "none";
                }
                topbarChip.style.display = "inline-flex";
            }

            if (avatarMedalSlot) {
                avatarMedalSlot.innerHTML = renderBadgeMedal(firstBadge, 20);
                avatarMedalSlot.style.display = "flex";
            }
        } else {
            if (topbarChip) topbarChip.style.display = "none";
            if (avatarMedalSlot) avatarMedalSlot.style.display = "none";
        }

        // 2. PROFILE DROPDOWN: "MY BADGES" SHELF
        const shelf = document.getElementById("dropdownBadgesShelf");
        if (shelf) {
            let shelfHtml = "";
            visibleBadges.forEach(b => {
                shelfHtml += renderBadgeMedal(b, 56);
            });

            // Empty dashed slots for unredeemed badges (up to 3)
            const emptySlotsCount = Math.min(3, Math.max(1, 4 - visibleBadges.length));
            for (let i = 0; i < emptySlotsCount; i++) {
                shelfHtml += `
                    <div class="dropdown-badge-slot-empty"
                         title="Unearned Badge Slot"
                         style="
                             width: 56px;
                             height: 56px;
                             border-radius: 50%;
                             border: 1.5px dashed #2a3248;
                             display: inline-flex;
                             align-items: center;
                             justify-content: center;
                             flex-shrink: 0;
                             background: rgba(255, 255, 255, 0.02);
                         ">
                         <i class="fa-solid fa-lock" style="color: #4b5563; font-size: 16px;" aria-hidden="true"></i>
                    </div>
                `;
            }
            shelf.innerHTML = shelfHtml;
        }

        // 3. ACHIEVEMENTS PAGE: UPDATE CARDS FOR REDEEMED STATUS & SWITCH
        updateAchievementsPageCards(badges);
    }

    function updateAchievementsPageCards(badges) {
        const cards = document.querySelectorAll("#rewards .vault-card");
        if (!cards || cards.length === 0) return;

        cards.forEach(card => {
            const rewardId = card.dataset.rewardId;
            const badge = (badges || []).find(b => b.id === rewardId);
            const isRedeemed = Boolean(badge);

            if (isRedeemed) {
                card.classList.add("redeemed", "unlocked");
                card.classList.remove("locked");
                card.dataset.redeemed = "true";

                // Add or update REDEEMED pill
                let pill = card.querySelector(".vault-redeemed-pill");
                if (!pill) {
                    pill = document.createElement("span");
                    pill.className = "vault-redeemed-pill";
                    pill.innerHTML = '<i class="fa-solid fa-check"></i> REDEEMED';
                    const numLabel = card.querySelector(".vault-card-num");
                    if (numLabel && numLabel.parentNode) {
                        numLabel.parentNode.insertBefore(pill, numLabel.nextSibling);
                    }
                }

                // Replace progress row and button with the toggle switch row
                let toggleRow = card.querySelector(".vault-toggle-shelf");
                if (!toggleRow) {
                    const progressRow = card.querySelector(".vault-progress-row");
                    const redeemBtn = card.querySelector(".vault-redeem-btn");
                    if (progressRow) progressRow.style.display = "none";
                    if (redeemBtn) redeemBtn.style.display = "none";

                    toggleRow = document.createElement("div");
                    toggleRow.className = "vault-toggle-shelf";
                    card.appendChild(toggleRow);
                }

                const isChecked = badge.showOnProfile !== false;
                toggleRow.innerHTML = `
                    <div class="vault-switch-divider"></div>
                    <div class="vault-switch-row">
                        <span class="vault-switch-text">Show on my profile</span>
                        <button type="button"
                                class="vault-switch-btn ${isChecked ? 'active' : ''}"
                                role="switch"
                                aria-checked="${isChecked}"
                                aria-label="Show ${badge.name} on my profile"
                                onclick="window.handleBadgeToggle('${badge.id}', ${!isChecked})">
                            <span class="vault-switch-knob"></span>
                        </button>
                    </div>
                `;
            } else {
                card.classList.remove("redeemed");
                card.dataset.redeemed = "false";
                const pill = card.querySelector(".vault-redeemed-pill");
                if (pill) pill.remove();

                const toggleRow = card.querySelector(".vault-toggle-shelf");
                if (toggleRow) toggleRow.remove();

                const progressRow = card.querySelector(".vault-progress-row");
                const redeemBtn = card.querySelector(".vault-redeem-btn");
                if (progressRow) progressRow.style.display = "flex";
                if (redeemBtn) redeemBtn.style.display = "flex";
            }
        });
    }

    // -------------------------------------------------------------------------
    // 5. INJECT COMPONENT STYLES
    // -------------------------------------------------------------------------
    function injectBadgeStyles() {
        if (document.getElementById("badge-component-styles")) return;
        const style = document.createElement("style");
        style.id = "badge-component-styles";
        style.textContent = `
            /* Top Bar Chip */
            .topbar-badge-chip {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #12384a;
                border: 1px solid #2a5b78;
                border-radius: 999px;
                padding: 4px 14px 4px 5px;
                color: #ffffff;
                font-size: 14px;
                font-weight: 800;
                line-height: 1;
                cursor: default;
                user-select: none;
                transition: transform 150ms ease;
            }
            .topbar-badge-chip:hover {
                transform: translateY(-1px);
            }
            .topbar-chip-more {
                font-size: 12px;
                font-weight: 800;
                color: #38d6ff;
                margin-left: 2px;
            }

            /* Avatar Medal Badge */
            .topbar-avatar-medal {
                position: absolute;
                bottom: -6px;
                right: -6px;
                z-index: 3;
                pointer-events: none;
            }

            /* Profile Dropdown Section */
            .dropdown-badges-section {
                padding: 12px 0 10px 0;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                margin-top: 8px;
            }
            .dropdown-badges-header {
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .14em;
                color: #38d6ff;
                text-transform: uppercase;
                margin-bottom: 10px;
            }
            .dropdown-badges-shelf {
                display: flex;
                align-items: center;
                gap: 10px;
                overflow-x: auto;
                padding-bottom: 12px;
            }
            .dropdown-badges-btn {
                width: 100%;
                min-height: 44px;
                background: #38d6ff;
                color: #070a12;
                font-size: 13px;
                font-weight: 800;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 150ms ease;
            }
            .dropdown-badges-btn:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }
            .dropdown-badges-btn:focus-visible {
                outline: 2px solid #38d6ff;
                outline-offset: 3px;
            }

            /* Achievements Redeemed Pill */
            #rewards .vault-redeemed-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: var(--card-accent, #38d6ff);
                color: #070a12;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: .08em;
                padding: 3px 10px;
                border-radius: 999px;
                margin-left: 8px;
                vertical-align: middle;
            }

            #rewards .vault-card.redeemed {
                border-color: var(--card-accent);
                box-shadow: 0 0 34px var(--accent-44, rgba(56, 214, 255, 0.27));
            }

            /* Achievements Switch Row */
            #rewards .vault-toggle-shelf {
                margin-top: auto;
                padding-top: 10px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                position: relative;
                z-index: 2;
            }
            #rewards .vault-switch-divider {
                width: 100%;
                height: 1px;
                background: rgba(255, 255, 255, 0.08);
            }
            #rewards .vault-switch-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 44px;
            }
            #rewards .vault-switch-text {
                font-size: 13.5px;
                font-weight: 700;
                color: #ffffff;
            }
            #rewards .vault-switch-btn {
                width: 48px;
                height: 28px;
                border-radius: 999px;
                background: #1a2133;
                border: 1px solid #232b40;
                cursor: pointer;
                position: relative;
                transition: background 200ms ease, border-color 200ms ease;
                padding: 0;
                outline: none;
                flex-shrink: 0;
            }
            #rewards .vault-switch-btn.active {
                background: #38d6ff;
                border-color: #38d6ff;
            }
            #rewards .vault-switch-btn:focus-visible {
                outline: 2px solid #38d6ff;
                outline-offset: 3px;
            }
            #rewards .vault-switch-knob {
                position: absolute;
                top: 3px;
                left: 3px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
                transition: transform 200ms ease;
            }
            #rewards .vault-switch-btn.active .vault-switch-knob {
                transform: translateX(20px);
                background: #070a12;
            }

            /* Responsive: hide text chip on small screens */
            @media (max-width: 768px) {
                .topbar-badge-chip {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // -------------------------------------------------------------------------
    // 6. INITIALIZATION & EXPORTS
    // -------------------------------------------------------------------------
    window.renderBadgeMedal = renderBadgeMedal;
    window.renderUserBadges = renderUserBadges;
    window.fetchUserBadges = fetchUserBadges;
    window.toggleBadgeVisibility = toggleBadgeVisibility;
    window.syncBadgesAcrossUI = syncBadgesAcrossUI;
    window.recordRedeemedBadge = recordRedeemedBadge;

    window.handleBadgeToggle = function (badgeId, newState) {
        toggleBadgeVisibility(badgeId, newState);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            injectBadgeStyles();
            fetchUserBadges();
        });
    } else {
        injectBadgeStyles();
        fetchUserBadges();
    }
})();
