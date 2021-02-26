import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	DiscordMessage,
	DiscordUtils,
} from "@framedjs/core";
import ReactionRoles from "../ReactionRoles.plugin";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "reactionrole",
			aliases: ["rr"],
			about: "Sets the reaction role message.",
			usage: "<message link>",
			userPermissions: {
				discord: {
					// Mods, Community Manager
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage) {
			if (
				msg.args &&
				msg.client.discord.client &&
				msg.discord.guild &&
				msg.args[0]
			) {
				const newMsg = await DiscordUtils.getMessageFromLink(
					msg.args[0],
					msg.client.discord.client,
					msg.discord.guild
				);

				if (newMsg) {
					await msg.client.provider.plugins.set(
						this.plugin.id,
						"url",
						newMsg.url
					);

					await msg.send(
						`${msg.discord.author} I've set the message!`
					);

					await (this.plugin as ReactionRoles).setupReactions();
					return true;
				} else {
					await msg.sendHelpForCommand(await msg.getPlace());
					return false;
				}
			}
		}

		return false;
	}
}
