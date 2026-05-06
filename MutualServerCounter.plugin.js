/**
 * @name MutualServerCounter
 * @author GOD128
 * @description Displays mutual server count beside usernames in chat.
 * @version 1.0.0
 */

module.exports = class MutualServerCounter {

    start() {

        console.log("[MSC] Starting Plugin...");

        this.injectCSS();

        this.UserStore =
            BdApi.Webpack.getStore?.("UserStore");

        this.GuildStore =
            BdApi.Webpack.getStore?.("GuildStore");

        this.SelectedChannelStore =
            BdApi.Webpack.getStore?.("SelectedChannelStore");

        this.MessageStore =
            BdApi.Webpack.getStore?.("MessageStore");

        this.currentUser =
            this.UserStore?.getCurrentUser?.();

        this.observer = new MutationObserver(() => {
            this.processChat();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.processChat();

        console.log("[MSC] Plugin Loaded.");
    }

    stop() {

        console.log("[MSC] Stopping Plugin...");

        this.observer?.disconnect();

        document.getElementById("msc-style")?.remove();

        document.querySelectorAll(".msc-badge")
            .forEach(e => e.remove());
    }

    injectCSS() {

        if (document.getElementById("msc-style")) return;

        const style = document.createElement("style");

        style.id = "msc-style";

        style.innerHTML = `

            .msc-badge {

                margin-left: 6px;

                padding: 1px 6px;

                border-radius: 10px;

                font-size: 10px;

                font-weight: 700;

                color: white;

                display: inline-flex;

                align-items: center;

                justify-content: center;

                line-height: 14px;

                vertical-align: middle;

                cursor: default;

                user-select: none;
            }

            .msc-low {
                background: #72767d;
            }

            .msc-medium {
                background: #f0b232;
            }

            .msc-high {
                background: #23a559;
            }

            .msc-extreme {
                background: #5865f2;
            }
        `;

        document.head.appendChild(style);
    }

    processChat() {

        try {

            const messageHeaders =
                document.querySelectorAll('[class*="header"]');

            for (const header of messageHeaders) {

                if (
                    header.querySelector(".msc-badge")
                ) continue;

                /**
                 * Username Element
                 */

                const username =
                    header.querySelector('[class*="username"]');

                if (!username) continue;

                /**
                 * Attempt User ID extraction
                 */

                const reactInstance =
                    BdApi.ReactUtils.getInternalInstance(username);

                if (!reactInstance) continue;

                let user = null;

                let fiber = reactInstance;

                /**
                 * Traverse React Fiber
                 */

                for (let i = 0; i < 30; i++) {

                    if (!fiber) break;

                    const possibleUser =
                        fiber.memoizedProps?.message?.author;

                    if (possibleUser?.id) {

                        user = possibleUser;

                        break;
                    }

                    fiber = fiber.return;
                }

                if (!user) continue;

                /**
                 * Don't show on self
                 */

                if (user.id === this.currentUser?.id)
                    continue;

                const mutuals =
                    this.calculateMutualServers(user.id);

                const badge =
                    document.createElement("span");

                badge.classList.add("msc-badge");

                /**
                 * Color Coding
                 */

                if (mutuals <= 2) {

                    badge.classList.add("msc-low");

                } else if (mutuals <= 10) {

                    badge.classList.add("msc-medium");

                } else if (mutuals <= 30) {

                    badge.classList.add("msc-high");

                } else {

                    badge.classList.add("msc-extreme");
                }

                badge.innerText = `${mutuals} Mutual`;

                /**
                 * Tooltip
                 */

                const guildNames =
                    this.getMutualGuildNames(user.id);

                badge.title =
                    guildNames.join("\n") ||
                    "No mutual servers";

                username.appendChild(badge);
            }

        } catch (err) {

            console.error("[MSC] processChat Error:", err);
        }
    }

    calculateMutualServers(userId) {

        try {

            const guilds =
                this.GuildStore.getGuilds();

            let count = 0;

            for (const guildId in guilds) {

                try {

                    const guild =
                        guilds[guildId];

                    /**
                     * Member check
                     */

                    const member =
                        BdApi.Webpack
                            .getModule(m =>
                                m?.getMember
                            )
                            ?.getMember(guildId, userId);

                    if (member) {
                        count++;
                    }

                } catch {}
            }

            return count;

        } catch (err) {

            console.error("[MSC] calculateMutualServers Error:", err);

            return 0;
        }
    }

    getMutualGuildNames(userId) {

        try {

            const guilds =
                this.GuildStore.getGuilds();

            const names = [];

            for (const guildId in guilds) {

                try {

                    const guild =
                        guilds[guildId];

                    const member =
                        BdApi.Webpack
                            .getModule(m =>
                                m?.getMember
                            )
                            ?.getMember(guildId, userId);

                    if (member) {

                        names.push(guild.name);
                    }

                } catch {}
            }

            return names;

        } catch {

            return [];
        }
    }
};