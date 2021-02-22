import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordUtils,
	EmbedHelper,
	Logger,
	NotFoundError,
} from "@framedjs/core";
import { oneLine } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "user",
			prefixes: ["d."],
			about: "Gets the user for Discord markdown formatting.",
			description: oneLine`
			Gets the user for Discord markdown formatting.
			The user parameter can be a @mention, nickname, username, username#0000, or ID.
			`,
			usage: "[username]",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		const newContent = msg.getArgsContent().trim();

		if (msg.args) {
			if (msg.discord) {
				// Makes sure newContent actually is a valid parameter
				if (newContent && newContent.length == 0) {
					await msg.sendHelpForCommand();
					return false;
				}
				let newMemberOrUser:
					| Discord.GuildMember
					| Discord.User
					| undefined;

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
						await EmbedHelper.getCheckOutFooter(msg, this.id)
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
