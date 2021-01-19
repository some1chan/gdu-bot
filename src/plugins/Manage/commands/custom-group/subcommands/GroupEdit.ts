import { Message, BaseCommand, BaseSubcommand, PluginManager, Logger } from "framed.js";
import { oneLine } from "common-tags";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "edit",
			aliases: ["change", "rename"],
			about: "Edits a custom group.",
			usage: `"<old group>" "<[emote] new group>"`,
			hideUsageInHelp: true,
			examples: oneLine`
			\`{{prefix}}{{id}} edit "Food Stuff" "🍏 Food"\``,
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (!this.baseCommand.hasPermission(msg, this.baseCommand.permissions)) {
			this.baseCommand.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			const argsContent = msg.getArgsContent([msg.args[0]]);
			const parse = Message.getArgs(argsContent, {
				quoteSections: "flexible",
			});

			// If there's no first or second argument, show help
			if (parse.length < 2) {
				await PluginManager.sendHelpForCommand(msg);
				return false;
			}

			const parseFirstArgs = Message.parseEmojiAndString(parse[0], []);
			const parseSecondArg = Message.parseEmojiAndString(parse[1], []);

			if (parseFirstArgs && parseSecondArg) {
				const oldGroup = await this.client.database.findGroup(parseFirstArgs.newContent);

				if (!oldGroup) {
					await msg.discord?.channel.send(oneLine`${msg.discord.author},
					I couldn't find a group with the name "${parseFirstArgs.newContent}"
					to edit. Please make sure that the group exists.`);
					return false;
				}

				const { newContent, newEmote } = parseSecondArg;
				try {
					await this.client.database.editGroup(
						parseFirstArgs.newContent,
						newContent,
						newEmote
					);
					if (newEmote) {
						await msg.discord?.channel.send(oneLine`${msg.discord.author},
						I've renamed the group "${parseFirstArgs.newContent}" into
						"${parseSecondArg.newContent}", and changed the emote to
						"${parseSecondArg.newEmote}" successfully!`);
					} else {
						await msg.discord?.channel.send(oneLine`${msg.discord.author},
						I've renamed the group "${parseFirstArgs.newContent}" into
						"${parseSecondArg.newContent}" successfully!`);
					}
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(`${msg.discord.author}, ${error.message}`);
					} else {
						Logger.error(error.stack);
					}
					return false;
				}
			} else {
				await PluginManager.sendHelpForCommand(msg);
				return false;
			}

			return true;
		}
		return false;
	}
}
