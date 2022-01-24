import {
	BaseEvent,
	BasePlugin,
	Discord,
	EmbedHelper,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";
import ModerationPlugin from "../Moderation.plugin";
import * as AuditLogValidity from "../utils/AuditLogValidity";

export default class extends BaseEvent {
	plugin!: ModerationPlugin;

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "modGuildBanRemove",
			discord: {
				name: "guildBanRemove",
			},
		});
	}

	async run(ban: Discord.GuildBan): Promise<void> {
		try {
			// Correct guild check
			const guild = ban.guild;
			if (!this.plugin.checkMatchingGuild(guild)) {
				return;
			}
			// const guild = await discordClient.guilds.fetch({ guild: guildId });
			// if (!guild) {
			// 	throw new Error(`Guild with ID ${guildId} not found!`);
			// }
			if (!guild?.available) return;

			// Variables
			const channel = await this.plugin.getModLogChannel(guild);

			// Send message into logs channel
			const embed = EmbedHelper.getTemplateRaw(
				EmbedHelper.getColorWithFallback(guild)
			)
				.setTitle("Member Unbanned")
				.setFooter({
					text: `User ID: ${ban.user.id}`,
				})
				.setTimestamp();

			const me = guild.me;
			let failedFetch = true;
			if (me?.permissions.has("VIEW_AUDIT_LOG")) {
				const fetchedLogs = await guild.fetchAuditLogs({
					// limit: 1,
					type: "MEMBER_BAN_REMOVE",
				});
				const updateLog = AuditLogValidity.getValidAuditLog(
					fetchedLogs as unknown as Discord.GuildAuditLogs<"ALL">,
					ban.user.id
				);
				if (updateLog?.target?.id == ban.user.id) {
					embed
						.addField(
							"Info",
							oneLine`:person_lifting_weights: User ${ban.user} was unbanned by ${updateLog.executor}.`
						)
						.setFooter({
							text: stripIndents`User ID: ${ban.user.id}
							Moderator user ID: ${updateLog.executor?.id}`,
						});
					failedFetch = false;
				}
			}

			if (failedFetch) {
				embed.addField(
					"Info",
					oneLine`:person_lifting_weights: User ${ban.user} was unbanned by a moderator.`
				);
			}

			if (ban.reason) {
				embed.addField(
					"Reason",
					ban.reason ?? "*No reason specified.*"
				);
			}
			await channel.send({
				embeds: [embed],
			});
		} catch (error) {
			Logger.error((error as Error).stack);
		}
	}
}
