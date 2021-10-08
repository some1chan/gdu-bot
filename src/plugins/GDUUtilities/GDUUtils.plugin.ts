import {
	BasePlugin,
	Client,
	Discord,
	EmbedHelper,
	Logger,
} from "@framedjs/core";
import { oneLine, oneLineCommaLists, stripIndents } from "common-tags";
import path from "path";

interface Roles {}

export default class GDUUtils extends BasePlugin {
	notificationRolesId = "notification_roles";

	constructor(client: Client) {
		super(client, {
			id: "io.gdu.utils",
			name: "GDU Utilities",
			description: "Helper commands for GDU.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: "🔧",
			groupName: "GDU Utilities",
		});
	}

	async setupEvents() {
		if (this.client.discord.client) {
			this.client.discord.client.on(
				"interactionCreate",
				async interaction => this.interactionEvents(interaction)
			);
		}
	}

	async interactionEvents(interaction: Discord.Interaction) {
		try {
			if (interaction.isButton()) {
				Logger.debug(
					`${interaction.componentType} : ${interaction.customId}`
				);
				await this.buttonEvents(interaction);
			} else if (interaction.isSelectMenu()) {
				Logger.debug(
					`${interaction.componentType} : ${interaction.customId}`
				);
				await this.selectMenuEvents(interaction);
			}
		} catch (error) {
			Logger.error((error as Error).stack);
		}
	}

	async buttonEvents(interaction: Discord.ButtonInteraction) {
		switch (interaction.customId) {
			case "list_roles":
				if (!interaction.inGuild() || !interaction.guild?.me) {
					Logger.error("aaaaaaaaaaa");
					break;
				}

				const roles = interaction.member.roles;
				// console.log(a);
				if (roles instanceof Discord.GuildMemberRoleManager) {
					const aRoleList = oneLineCommaLists`${Array.from(
						roles.cache.values()
					)}`;

					// const place = this.client.provider.places.get(
					// 	interaction.guild.id ?? "discord_default"
					// ) ?? {
					// 	id: "default",
					// 	platform: "discord",
					// };
					// const embed = EmbedHelper.getTemplateRaw(
					// 	EmbedHelper.getColorWithFallback(
					// 		interaction.guild
					// 	),
					// 	await EmbedHelper.getCheckOutFooter(
					// 		this.client.formatting,
					// 		place,
					// 		""
					// 	)
					// )
					// 	.setTitle("Roles")
					// 	.setDescription(
					// 		oneLineCommaLists`${Array.from(
					// 			a.cache.values()
					// 		)}`
					// 	);

					// await interaction.reply({
					// 	embeds: [embed],
					// 	ephemeral: true,
					// });

					const youtubeRole = roles.resolve(
						process.env.YOUTUBE_ROLE_ID as Discord.Snowflake
					);
					const twitchRole = roles.resolve(
						process.env.TWITCH_ROLE_ID as Discord.Snowflake
					);
					const eventRole = roles.resolve(
						process.env.EVENT_ROLE_ID as Discord.Snowflake
					);
					const gameRole = roles.resolve(
						process.env.GAME_ROLE_ID as Discord.Snowflake
					);
					const streakRole = roles.resolve(
						process.env.STREAK_ROLE_ID as Discord.Snowflake
					);

					if (process.env.YOUTUBE_ROLE_ID == null)
						Logger.error("YouTube role is missing");
					if (process.env.TWITCH_ROLE_ID == null)
						Logger.error("Twitch role is missing");
					if (process.env.EVENT_ROLE_ID == null)
						Logger.error("Event role is missing");
					if (process.env.GAME_ROLE_ID == null)
						Logger.error("Game role is missing");
					if (process.env.STREAK_ROLE_ID == null)
						Logger.error("Streak role is missing");

					let roleList: string[] = [];

					if (youtubeRole && roles.cache.has(youtubeRole?.id))
						roleList.push(`${youtubeRole}`);
					if (twitchRole && roles.cache.has(twitchRole?.id))
						roleList.push(`${twitchRole}`);
					if (eventRole && roles.cache.has(eventRole?.id))
						roleList.push(`${eventRole}`);
					if (gameRole && roles.cache.has(gameRole?.id))
						roleList.push(`${gameRole}`);
					if (streakRole && roles.cache.has(streakRole?.id))
						roleList.push(`${streakRole}`);

					if (roleList.length == 0) roleList[0] = "None so far!";

					await interaction.reply({
						content: stripIndents`
							You have these roles:
							> ${oneLineCommaLists`${roleList}`}`,
						allowedMentions: {
							parse: [],
						},
						ephemeral: true,
					});
				} else {
					Logger.error("No clue what to do with this thing");
				}

				break;

			default:
				Logger.debug(
					`Button "${interaction.customId}" was called, but possibly unknown`
				);
				break;
		}
	}

	async selectMenuEvents(interaction: Discord.SelectMenuInteraction) {
		switch (interaction.customId) {
			case this.notificationRolesId:
				if (
					!interaction.member?.roles ||
					!interaction.guild ||
					!interaction.guild.available ||
					!(
						interaction.member.roles instanceof
						Discord.GuildMemberRoleManager
					)
				) {
					Logger.error(
						oneLine`Either the interaction's member, guild, or roles
						variable was undefined, or the roles variable
						wasn't a GuildMemberRoleManager.`
					);
					return;
				}

				const youtubeRoleId = process.env
					.YOUTUBE_ROLE_ID as Discord.Snowflake;
				const twitchRoleId = process.env
					.TWITCH_ROLE_ID as Discord.Snowflake;
				const eventRoleId = process.env
					.EVENT_ROLE_ID as Discord.Snowflake;
				const gameRoleId = process.env
					.GAME_ROLE_ID as Discord.Snowflake;
				const streakRoleId = process.env
					.STREAK_ROLE_ID as Discord.Snowflake;
				const roleListIds = [
					youtubeRoleId,
					twitchRoleId,
					eventRoleId,
					gameRoleId,
					streakRoleId,
				];
				await interaction.guild.roles.fetch(youtubeRoleId);
				await interaction.guild.roles.fetch(twitchRoleId);
				await interaction.guild.roles.fetch(eventRoleId);
				await interaction.guild.roles.fetch(gameRoleId);
				await interaction.guild.roles.fetch(streakRoleId);

				const roleListToAdd: Discord.Snowflake[] = [];
				const roleListToRemove: Discord.Snowflake[] = [];

				Logger.debug(interaction.values);
				for (const roleId of roleListIds) {
					if (!roleId) continue;

					if (interaction.values.includes(roleId)) {
						// Does the selections contain this role?
						// Add it if user doens't have role
						if (!interaction.member.roles.cache.has(roleId)) {
							roleListToAdd.push(roleId);
						}
					} else {
						// Does the selections not contain this role?
						// Remove it if user has role
						if (interaction.member.roles.cache.has(roleId)) {
							roleListToRemove.push(roleId);
						}
					}
				}

				let functions: Promise<unknown>[] = [];

				if (roleListToAdd.length > 0)
					functions.push(interaction.member.roles.add(roleListToAdd));
				if (roleListToRemove.length > 0)
					functions.push(
						interaction.member.roles.remove(roleListToRemove)
					);
				let results = await Promise.allSettled([
					roleListToAdd,
					roleListToRemove,
				]);

				for (let i = 0; i < results.length; i++) {
					const result = results[i];
					if (result.status == "rejected") {
						Logger.error(
							`Role add/remove #${i} rejected: ${result.reason}`
						);
					}
				}

				await interaction.reply({
					content: "I've changed your roles!",
					ephemeral: true,
				});
				break;

			default:
				break;
		}
	}
}
