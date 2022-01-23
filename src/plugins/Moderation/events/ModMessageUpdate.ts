import {
	BaseEvent,
	BasePlugin,
	Discord,
	EmbedHelper,
	Logger,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import ModerationPlugin from "../Moderation.plugin";

export default class extends BaseEvent {
	plugin!: ModerationPlugin;

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "modMessageUpdate",
			discord: {
				name: "messageUpdate",
			},
		});
	}

	async run(
		partialOld: Partial<Discord.Message>,
		partialNew: Partial<Discord.Message>
	): Promise<void> {
		try {
			// Skip bot edits
			if (partialNew.author?.bot) return;

			// If the content is the same, but something changed (ex. pinned, embed) ignore it
			// to avoid running a command multiple times
			if (partialOld.content == partialNew.content) return;

			// Correct guild check
			if (!this.plugin.checkMatchingGuild(partialNew.guild)) {
				return;
			}
			// const guild = await discordClient.guilds.fetch({ guild: guildId });
			// if (!guild) {
			// 	throw new Error(`Guild with ID ${guildId} not found!`);
			// }
			const guild = partialNew.guild;
			if (!guild?.available) return;

			// Sends message to logs
			const channel = await this.plugin.getModLogChannel(guild);
			const fieldLimit = 1024; // https://discord.com/developers/docs/resources/channel#embed-limits
			const oldContent =
				partialOld.content == undefined
					? "*No message data found.*"
					: partialOld.content.length > fieldLimit
					? `${partialOld.content.slice(0, fieldLimit - 3)}...`
					: partialOld.content;
			const newContent =
				partialNew.content == undefined
					? "*No message data found.*"
					: partialNew.content.length > fieldLimit
					? `${partialNew.content.slice(0, fieldLimit - 3)}...`
					: partialNew.content;
			const embed = EmbedHelper.getTemplateRaw(
				EmbedHelper.getColorWithFallback(guild)
			)
				.setTitle("Message Edit")
				.setDescription(
					partialNew.url
						? `[Jump to the original message.](${partialNew.url})`
						: ""
				)
				.addField(
					"Original Message",
					oldContent ?? "*Message contents are empty.*"
				)
				.addField(
					"New Message",
					newContent ?? "*Message contents are empty.*"
				)
				.addField(
					"Info",
					oneLine`:pencil2: Message by ${partialNew.author}.`
				)
				.setFooter({ text: `User ID: ${partialNew.id}` });
			await channel.send({ embeds: [embed] });
		} catch (error) {
			Logger.error((error as Error).stack);
		}
	}
}
