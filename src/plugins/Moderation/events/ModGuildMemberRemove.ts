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
			id: "modGuildMemberRemove",
			discord: {
				name: "guildMemberRemove",
			},
		});
	}

	async run(
		member: Discord.GuildMember | Discord.PartialGuildMember
	): Promise<void> {
		try {
			const guild = member.guild;
			const me = guild.me;
			if (me?.permissions.has("VIEW_AUDIT_LOG")) {
				// Variables and various checks
				if (!this.plugin.checkMatchingGuild(guild)) {
					return;
				}
				// const guild = await discordClient.guilds.fetch({ guild: guildId });
				// if (!guild) {
				// 	throw new Error(`Guild with ID ${guildId} not found!`);
				// }
				if (!guild?.available) return;
				const channel = await this.plugin.getModLogChannel(guild);

				const fetchedLogs = await guild.fetchAuditLogs({
					limit: 3,
					type: "MEMBER_KICK",
				});
				const kickLog = AuditLogValidity.getValidAuditLog(
					fetchedLogs as unknown as Discord.GuildAuditLogs<"ALL">,
					member.id
				);
				if (!kickLog) {
					return;
				}

				const kickerText = kickLog.executor
					? ` by ${kickLog.executor}`
					: ` by a moderator`;
				let ban: Discord.GuildBan | undefined;
				try {
					ban = await guild.bans.fetch(member);
				} catch (error) {
					const err = error as Error;
					if (err.message != "Unknown Ban") {
						Logger.warn(err.stack);
					}
				}

				if (ban) {
					// Send message into logs channel
					const embed = EmbedHelper.getTemplateRaw(
						EmbedHelper.getColorWithFallback(guild)
					)
						.setTitle("Member Banned")
						.setFooter({
							text: `User ID: ${ban.user.id}`,
						})

						.setTimestamp();

					if (kickLog.executor) {
						embed
							.addField(
								"Info",
								oneLine`:hammer: Member ${ban.user} was banned by ${kickLog.executor}.`
							)
							.setFooter({
								text: `${embed.footer?.text}\nModerator user ID: ${kickLog.executor.id}`,
							});
					} else {
						embed.addField(
							"Info",
							oneLine`:hammer: Member ${ban.user} was banned by a moderator.`
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
				} else {
					const embed = EmbedHelper.getTemplateRaw(
						EmbedHelper.getColorWithFallback(guild)
					)
						.setTitle("Member Kicked")
						.addField(
							"Info",
							oneLine`:hammer: Member ${member} (${member.user.tag}) was kicked${kickerText}.`
						)
						.setFooter({
							text: stripIndents`User ID: ${member.user.id}
							Moderator user ID: ${kickLog.executor?.id ?? "unknown"}`,
						})
						.setTimestamp();

					if (kickLog.reason) {
						embed.addField(
							"Reason",
							kickLog.reason ?? "*No reason specified.*"
						);
					}

					await channel.send({
						embeds: [embed],
					});
				}

				// Send message into logs channel
			}
		} catch (error) {
			Logger.error((error as Error).stack);
		}
	}
}
