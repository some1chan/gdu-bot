import {
	BaseEvent,
	BasePlugin,
	Discord,
	EmbedHelper,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";
import ModerationPlugin from "../Moderation.plugin";

export default class extends BaseEvent {
	plugin!: ModerationPlugin;

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "modGuildMemberUpdate",
			discord: {
				name: "guildMemberUpdate",
			},
		});
	}

	async run(
		oldMember: Discord.GuildMember | Discord.PartialGuildMember,
		newMember: Discord.GuildMember
	): Promise<void> {
		try {
			// Skip bot updates
			if (newMember.user.bot) return;

			// Correct guild check
			const guild = newMember.guild;
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
			const me = guild.me;

			// Role change
			if (oldMember.roles.cache.size != newMember.roles.cache.size) {
				return;
			}

			// Member Nickname Change
			if (
				oldMember.nickname != null &&
				oldMember.nickname != newMember.nickname
			) {
				let executor: Discord.User | undefined;
				if (me?.permissions.has("VIEW_AUDIT_LOG")) {
					const fetchedLogs = await guild.fetchAuditLogs({
						limit: 1,
						type: "MEMBER_UPDATE",
					});
					const updateLog = fetchedLogs.entries.first();
					const foundLog = updateLog?.changes?.find(
						a => a.key == "nick"
					);
					if (updateLog && foundLog) {
						executor = updateLog.executor ?? undefined;
					}
				}
				const embed = EmbedHelper.getTemplateRaw(
					EmbedHelper.getColorWithFallback(guild)
				)
					.setTitle("Member Nickname Change")
					.setFooter({
						text: `User ID: ${newMember.id}`,
					})
					.setTimestamp();

				let string =
					executor && executor.id != newMember.id
						? `, by ${executor}`
						: ", but we don't know who.";
				embed.addField(
					"Info",
					oldMember.nickname != null && newMember.nickname != null
						? oneLine`:page_with_curl: Member ${newMember}'s nickname has changed from \`${oldMember.nickname}\` to \`${newMember.nickname}\`${string}.`
						: oldMember.nickname != null &&
						  oldMember.nickname == null
						? oneLine`:page_with_curl: Member ${newMember}'s nickname has been reset${string}.`
						: oneLine`An error occured when trying to find ${newMember}'s new nickname.`
				);

				if (executor && executor.id != newMember.id) {
					embed.setFooter({
						text: stripIndents`${embed.footer?.text}
						Moderator user ID: ${executor?.id}`,
					});
				}

				await channel.send({
					embeds: [embed],
				});
			}
			// Member Timeout and Un-timeout
			else if (
				!oldMember.isCommunicationDisabled() &&
				newMember.isCommunicationDisabled()
			) {
				// Timed out
				let timeContent = `<t:${(
					newMember.communicationDisabledUntil.getTime() / 1000
				).toFixed(0)}:R>`;
				const embed = EmbedHelper.getTemplateRaw(
					EmbedHelper.getColorWithFallback(guild)
				)
					.setTitle("Member Timeout")
					.setTimestamp();

				if (me?.permissions.has("VIEW_AUDIT_LOG")) {
					const fetchedLogs = await guild.fetchAuditLogs({
						limit: 1,
						type: "MEMBER_UPDATE",
					});
					const updateLog = fetchedLogs.entries.first();
					if (updateLog) {
						embed
							.addField(
								"Info",
								oneLine`:alarm_clock: Member ${newMember} was timed out by
								${updateLog.executor}, and will be removed ${timeContent}.`
							)
							.setFooter({
								text: stripIndents`User ID: ${newMember.id}
								Moderator user ID: ${updateLog.executor?.id}`,
							});
						if (updateLog.reason) {
							embed.addField("Reason", updateLog.reason);
						}
					}
				} else {
					embed
						.addField(
							"Info",
							oneLine`:alarm_clock: Member ${newMember} was timed out,
							and will be removed ${timeContent}.`
						)
						.setFooter({
							text: `User ID: ${newMember.id}`,
						});
				}
				await channel.send({
					embeds: [embed],
				});
			} else if (
				oldMember.isCommunicationDisabled() &&
				!newMember.isCommunicationDisabled()
			) {
				// Timeout removed by moderator
				const embed = EmbedHelper.getTemplateRaw(
					EmbedHelper.getColorWithFallback(guild)
				)
					.setTitle("Member Timeout Removed")
					.setTimestamp();

				const me = guild.me;
				if (me?.permissions.has("VIEW_AUDIT_LOG")) {
					const fetchedLogs = await guild.fetchAuditLogs({
						limit: 1,
						type: "MEMBER_UPDATE",
					});
					const updateLog = fetchedLogs.entries.first();
					if (updateLog) {
						embed
							.addField(
								"Info",
								oneLine`:alarm_clock: Member ${newMember}'s timeout has been removed by ${updateLog.executor}.`
							)
							.setFooter({
								text: stripIndents`User ID: ${newMember.id}
								Moderator user ID: ${updateLog.executor?.id}`,
							});
					}
				} else {
					embed
						.addField(
							"Info",
							oneLine`:alarm_clock: Member ${newMember}'s timeout has been removed by a moderator.`
						)
						.setFooter({
							text: `User ID: ${newMember.id}`,
						});
				}

				await channel.send({
					embeds: [embed],
				});
			}
		} catch (error) {
			Logger.error((error as Error).stack);
		}
	}
}
