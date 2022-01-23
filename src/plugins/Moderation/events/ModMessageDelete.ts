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
			id: "modMessageDelete",
			discord: {
				name: "messageDelete",
			},
		});
	}

	async run(message: Partial<Discord.Message>): Promise<void> {
		await this.runReturnEmbed(message);
	}

	async runReturnEmbed(
		message:
			| Discord.Message<boolean>
			| Discord.PartialMessage
			| Partial<Discord.Message>,
		fetchedLogs?:
			| Discord.GuildAuditLogs<"MESSAGE_DELETE">
			| Discord.GuildAuditLogs<"MESSAGE_BULK_DELETE">,
		rawCall = true
	) {
		// Variables and various checks
		const guild = message.guild;
		if (!this.plugin.checkMatchingGuild(guild)) {
			return;
		}
		// const guild = await discordClient.guilds.fetch({ guild: guildId });
		// if (!guild) {
		// 	throw new Error(`Guild with ID ${guildId} not found!`);
		// }
		if (!guild?.available) return;
		const channel = await this.plugin.getModLogChannel(guild);

		// Skip if message from clear command
		if (
			message.content?.startsWith("Bulk deleted ") &&
			message.author?.id == message.client?.user?.id &&
			rawCall
		) {
			return;
		}

		if (message.system) {
			return;
		}

		const auditDataDeleted =
			channel.id == message.channelId &&
			message.author?.id == message.client?.user?.id &&
			!message.content?.startsWith("Bulk deleted ") &&
			(message.embeds != undefined && message.embeds?.length > 0
				? message.embeds[0].footer?.text.includes(" ID: ")
				: true);

		// Sends messages to logs
		const deletedContent =
			message.content == undefined
				? "*No message data found.*"
				: message.content;
		const embedBase = EmbedHelper.getTemplateRaw(
			EmbedHelper.getColorWithFallback(guild)
		)
			.setTitle(`Message${rawCall ? " " : " Bulk "}Delete`)
			.setDescription(deletedContent)
			.setFooter({
				text: `User ID: ${message.author?.id ?? "unknown"}`,
			})
			.setTimestamp();

		const me = guild.me;
		const emoji = rawCall ? ":wastebasket:" : ":soap:";
		let failedToFetch = true;
		let executor: Discord.User | undefined;
		if (me?.permissions.has("VIEW_AUDIT_LOG")) {
			if (!fetchedLogs) {
				fetchedLogs = await guild.fetchAuditLogs({
					limit: 1,
					type: "MESSAGE_DELETE",
				});
			}
			const deleteLog = fetchedLogs.entries.first();

			// Check for bot executor, and stop code if it is a bot
			if (deleteLog?.executor?.bot && rawCall) return;

			if (deleteLog?.target?.id == message.author?.id) {
				embedBase
					.addField(
						"Info",
						oneLine`${emoji} Message by ${
							message.author ?? "unknown user"
						} 
							was deleted in ${message.channel}, by ${deleteLog?.target}}.`
					)
					.setFooter({
						text: `${embedBase.footer?.text}\nModerator user ID: ${
							deleteLog?.target.id ?? "unknown"
						}`,
					});
				failedToFetch = false;
			}

			executor = deleteLog?.executor ?? undefined;
		}

		if (failedToFetch) {
			embedBase.addField(
				"Info",
				oneLine`${emoji} Message by
				${message.author ?? "unknown user"}
				was deleted in ${message.channel}.`
			);
		}

		let attachments: Discord.MessageAttachment[] = [];
		if (message.attachments && message.attachments.size > 0) {
			attachments = Array.from(message.attachments.values());
			if (
				attachments.length == 1 &&
				attachments[0].contentType?.startsWith("image")
			) {
				embedBase.setImage(attachments[0].url);
				attachments = [];
			}
		}
		const embeds =
			message.embeds && message.embeds.length > 0
				? auditDataDeleted
					? message.embeds
					: [embedBase]
				: auditDataDeleted
				? []
				: [embedBase];

		let content = "";
		if (auditDataDeleted) {
			content = message.content ?? "*No message data found.*";
		} else if (attachments.length > 0) {
			for (const attachment of attachments) {
				const spoilerTags = attachment.spoiler ? "||" : "";
				content += `${spoilerTags}${attachment.url}${spoilerTags}\n`;
			}
			content = `**Attachments**\n${content}`;
		}

		if (rawCall) {
			const newMsg = await channel.send({
				content: content.length > 0 ? content : null,
				embeds: embeds,
			});

			if (auditDataDeleted) {
				await this.sendDeletedAuditMessage(newMsg, executor);
			}
		} else {
			return embedBase;
		}
	}

	async sendDeletedAuditMessage(
		newMsg: Discord.Message,
		executor?: Discord.User
	) {
		let whoDoneIt = executor ? `${executor}` : "Someone";
		let content = `${whoDoneIt} tried to delete an audit message in ${newMsg.channel}!`;
		content += ` That message have been recovered.`;
		await newMsg.reply(content);
	}
}
