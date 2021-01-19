import {
	Message,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
	DiscordUtils,
	PluginManager,
	NotFoundError,
	Logger,
} from "framed.js";
import { oneLine } from "common-tags";
import Discord from "discord.js";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "user",
			prefixes: [plugin.defaultPrefix, "d."],
			about: "Gets the user for Discord markdown formatting.",
			description: oneLine`
			Gets the user for Discord markdown formatting.
			The user parameter can be a @mention, nickname, username, username#0000, or ID.
			`,
			usage: "[username]",
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		const newContent = msg.getArgsContent().trim();

		if (msg.args) {
			if (msg.discord) {
				// Makes sure newContent actually is a valid parameter
				if (newContent && newContent.length == 0) {
					await PluginManager.sendHelpForCommand(msg);
					return false;
				}
				let newMemberOrUser: Discord.GuildMember | Discord.User | undefined;

				// Gets from a guild if it can. If not, fallback to getting from client.users
				if (msg.discord.guild && msg.discord.guild.available) {
					try {
						newMemberOrUser = await DiscordUtils.resolveMemberFetch(
							newContent,
							msg.discord.guild.members
						);
					} catch (error) {
						Logger.warn(error);
					}
				} else {
					try {
						newMemberOrUser = await DiscordUtils.resolveUserFetch(
							newContent,
							msg.discord.client.users
						);
					} catch (error) {
						Logger.debug(error);
					}
				}

				if (newMemberOrUser) {
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						this.client.helpCommands,
						this.id
					)
						.setTitle("User Formatting")
						.setDescription(`\`${newMemberOrUser}\``)
						.addField("Output", `${newMemberOrUser}`);

					await msg.discord.channel.send(embed);
					return true;
				} else {
					throw new NotFoundError({
						input: newContent,
						name: "User",
					});
				}
			} else {
				Logger.warn("unsupported");
			}
		}

		return false;
	}
}
