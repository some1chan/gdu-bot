import { BasePlugin, Client, DiscordUtils, Logger } from "@framedjs/core";
import path from "path";

export default class extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "io.gdu.reactionroles",
			name: "Jank GDU Reaction Roles",
			description: "(oh god)",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: "🗃",
			groupName: "Reaction Roles",
		});
	}

	async install(): Promise<void> {
		if (process.env.REACTION_MSG_LINK) {
			await this.client.provider.plugins.set(
				this.id,
				"url",
				process.env.REACTION_MSG_LINK
			);
		}
	}

	async setupEvents(): Promise<void> {
		const discordClient = this.client.discord.client;

		if (discordClient) {
			discordClient.once("ready", async () => {
				await this.setupReactions();
			});
		}
	}

	async setupReactions(): Promise<void> {
		const discordClient = this.client.discord.client;

		if (!discordClient) {
			return;
		}

		if (
			process.env.MAIN_GUILD_ID &&
			process.env.YOUTUBE_EMOJI &&
			process.env.TWITCH_EMOJI &&
			process.env.EVENT_EMOJI &&
			process.env.GAME_EMOJI &&
			process.env.STREAK_EMOJI
		) {
			const guild = discordClient.guilds.cache.get(
				process.env.MAIN_GUILD_ID
			);
			if (!guild) return;

			const url =
				(this.client.provider.plugins.get(this.id, "url") as string) ??
				process.env.REACTION_MSG_LINK;

			if (!url) return;

			try {
				const msg = await DiscordUtils.getMessageFromLink(
					url,
					discordClient,
					guild
				);

				if (msg) {
					msg.fetch();

					await Promise.all([
						!msg.reactions.cache.has(process.env.YOUTUBE_EMOJI)
							? msg.react(process.env.YOUTUBE_EMOJI)
							: undefined,
						!msg.reactions.cache.has(process.env.TWITCH_EMOJI)
							? msg.react(process.env.TWITCH_EMOJI)
							: undefined,
						!msg.reactions.cache.has(process.env.EVENT_EMOJI)
							? msg.react(process.env.EVENT_EMOJI)
							: undefined,
						!msg.reactions.cache.has(process.env.GAME_EMOJI)
							? msg.react(process.env.GAME_EMOJI)
							: undefined,
						!msg.reactions.cache.has(process.env.STREAK_EMOJI)
							? msg.react(process.env.STREAK_EMOJI)
							: undefined,
					]);
				}
			} catch (error) {
				Logger.error(error.stack);
			}
		}
	}
}
