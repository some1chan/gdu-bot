import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	DiscordUtils,
	NotFoundError,
	PluginManager,
	Logger,
} from "@framedjs/core";
import { oneLine } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "role",
			about: "Gets the role for Discord markdown formatting.",
			description: oneLine`
			Gets the role for Discord markdown formatting.
			The role parameter can be the @role, name, or ID.
			`,
			usage: "<role>",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args) {
			if (msg.discord) {
				if (!msg.discord.guild || msg.discord.channel.type == "dm") {
					msg.discord.channel.send(
						`${msg.discord.author}, you must be in a Discord server in order to run this command!`
					);
					return false;
				}

				const newContent = msg.getArgsContent();
				if (newContent.length == 0) {
					await msg.sendHelpForCommand();
					return false;
				}

				const newRole = DiscordUtils.resolveRole(
					newContent,
					msg.discord.guild.roles
				);
				const embed = EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg, this.id)
				);

				if (newRole) {
					embed
						.setTitle("Role Formatting")
						.setDescription(`\`${newRole}\``)
						.addField("Output", `${newRole}`);
					await msg.discord.channel.send(embed); // Uncomment me!
					return true;
				} else {
					throw new NotFoundError({
						input: newContent,
						name: "Role",
						extraMessage:
							"Check your spelling and caps (this command is case-sensitive!) and try again.",
					});
				}
			} else {
				Logger.warn("unsupported");
			}
		}

		return false;
	}
}
