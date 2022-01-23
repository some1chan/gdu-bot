import { BaseEvent, BasePlugin, Discord, Logger } from "@framedjs/core";
import ModerationPlugin from "../Moderation.plugin";
import ModMessageDelete from "./ModMessageDelete";

export default class extends BaseEvent {
	plugin!: ModerationPlugin;

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "modMessageDeleteBulk",
			discord: {
				name: "messageDeleteBulk",
			},
		});
	}

	async run(
		messages: Discord.Collection<
			string,
			Discord.Message<boolean> | Discord.PartialMessage
		>
	): Promise<void> {
		const eventName = "modMessageDelete";
		const event = this.plugin.events.get(eventName) as ModMessageDelete;
		if (!event) {
			Logger.error(`Event ID "${eventName}" wasn't found!`);
			return;
		}

		let fetchedLogs:
			| Discord.GuildAuditLogs<"MESSAGE_BULK_DELETE">
			| undefined;
		let embeds: Discord.MessageEmbed[] = [];
		let guild: Discord.Guild | undefined;
		let channel: Discord.TextChannel | Discord.NewsChannel | undefined;
		for await (const [, message] of messages) {
			if (!message.guild) return;
			if (!guild) {
				guild = message.guild;
			}
			if (!channel) {
				channel = await this.plugin.getModLogChannel(guild);
			}

			if (!fetchedLogs) {
				fetchedLogs = await message.guild.fetchAuditLogs({
					limit: 1,
					type: "MESSAGE_BULK_DELETE",
				});
			}
			const embed = await event.runReturnEmbed(
				message,
				fetchedLogs,
				false
			);
			if (!embed) {
				Logger.error("No embed was given");
				continue;
			}

			embeds.push(embed);
			if (embeds.length == 10) {
				try {
					await channel.send({
						embeds,
					});
				} catch (error) {
					Logger.error((error as Error).stack);
				}
				embeds = [];
			}
		}

		if (channel && embeds.length != 0) {
			await channel.send({
				embeds,
			});
		}
	}
}
