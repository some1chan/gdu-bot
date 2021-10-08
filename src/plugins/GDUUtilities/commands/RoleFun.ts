import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";
import GDUUtils from "../GDUUtils.plugin";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "rolefun",
			about: "Not a real command. Instead, you should copy me!",
			usage: "<required param> [optional param]",
			userPermissions: {
				botOwnersOnly: true,
				checkAutomatically: false,
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		// Manually checks user permission to stay silent
		const permsResult = this.checkUserPermissions(
			msg,
			this.userPermissions
		);
		if (!permsResult.success) {
			Logger.warn(
				`${this.id} called by user without permission (${msg.discord?.author.id})`
			);
			return false;
		}

		const row = new Discord.MessageActionRow().addComponents(
			new Discord.MessageSelectMenu()
				.setCustomId((this.plugin as GDUUtils).notificationRolesId)
				.setPlaceholder("Nothing selected")
				.setMinValues(0)
				.setMaxValues(5)
				.addOptions([
					{
						label: "YouTube Notifications",
						description:
							"Get notified when Tim Ruswick posts a new YouTube video.",
						value: process.env.YOUTUBE_ROLE_ID ?? "",
					},
					{
						label: "Twitch Notifications",
						description:
							"Get notified when Tim Ruswick goes live on Twitch.",
						value: process.env.TWITCH_ROLE_ID ?? "",
					},
					{
						label: "Event Notifications",
						description: "Get notified for community events.",
						value: process.env.EVENT_ROLE_ID ?? "",
					},
					{
						label: "Game Notifications",
						description:
							"Get notified about Tim Ruswick's games and related content.",
						value: process.env.GAME_ROLE_ID ?? "",
					},
					{
						label: "Streak Notifications",
						description: "Get notified for each new streak day.",
						value: process.env.STREAK_ROLE_ID ?? "",
					},
				])
		);

		if (msg instanceof DiscordMessage) {
			await msg.discord.channel.send({
				content: stripIndents`
				**Notification Roles**
				Select some roles to get notified about server activities!`,
				components: [row],
			});
			await msg.discord.channel.send({
				content: oneLine`Unsure of what roles you have?`,
				components: [
					new Discord.MessageActionRow().addComponents([
						new Discord.MessageButton()
							.setCustomId("list_roles")
							.setStyle("SECONDARY")
							.setLabel("List Roles"),
						new Discord.MessageButton()
							.setCustomId("list_achievement_roles")
							.setStyle("SECONDARY")
							.setLabel("List Achievement Roles"),
					]),
				],
			});
			return true;
		}

		return false;
	}
}
