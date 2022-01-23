import { BasePlugin, Client, Discord } from "@framedjs/core";
import path from "path";

export default class extends BasePlugin {
	constructor(client: Client) {
		super(client, {
			id: "default.bot.moderation",
			name: "Moderation",
			description: "Moderation commands.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				discordInteractions: path.join(__dirname, "interactions"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: ":hammer:",
			groupName: "Moderation",
		});
	}

	async setupEvents(): Promise<void> {
		const discordClient = this.client.discord.client;
		if (!discordClient) return;

		// discordClient.on("guildMemberUpdate", (oldMember, newMember) => {
		// 	if (oldMember.roles.cache.size == newMember.roles.cache.size) {
		// 		console.log("uwu");
		// 	}
		// });
		// discordClient.on("messageDeleteBulk", (messages) = >{
			
		// });
	}

	/**
	 * Not intended for anything other than private bot projects
	 */
	checkMatchingGuild(guild?: Discord.Guild | null) {
		const guildId = process.env.MOD_LOG_GUILD_ID ?? "274284473447612416";
		return guildId == guild?.id;
	}

	async getModLogChannel(guild: Discord.Guild) {
		const discordClient = this.client.discord.client;
		if (!discordClient) {
			throw new Error("Discord client not found!");
		}

		const channelId = process.env.MOD_LOG_CHANNEL_ID ?? "822333879578525726";
		if (!channelId) {
			throw new Error(
				"MOD_LOG_CHANNEL_ID environment variable not found!"
			);
		}

		const channel = await guild.channels.fetch(channelId);
		if (!channel) {
			throw new Error(`Channel with ID ${channelId} not found!`);
		}

		if (!channel.isText()) {
			throw new Error(`Channel with ${channelId} is not a text channel!`);
		}

		return channel;
	}
}
