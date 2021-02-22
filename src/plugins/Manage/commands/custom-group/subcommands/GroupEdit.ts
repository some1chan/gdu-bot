import {
	BaseMessage,
	BaseCommand,
	BaseSubcommand,
	PluginManager,
	Logger,
	FriendlyError,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import { CustomClient } from "../../../../../structures/CustomClient";

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

	async run(msg: BaseMessage): Promise<boolean> {
		if (!(this.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		if (msg.args) {
			const argsContent = msg.getArgsContent([msg.args[0]]);
			const parse = BaseMessage.getArgs(argsContent, {
				quoteSections: "flexible",
			});

			// If there's no first or second argument, show help
			if (parse.length < 2) {
				await msg.sendHelpForCommand();
				return false;
			}

			const parseFirstArgs = BaseMessage.parseEmojiAndString(parse[0], []);
			const parseSecondArg = BaseMessage.parseEmojiAndString(parse[1], []);

			if (parseFirstArgs && parseSecondArg) {
				const oldGroup = await this.client.database.findGroup(
					parseFirstArgs.newContent
				);

				if (!oldGroup) {
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
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
						await msg.discord?.channel
							.send(oneLine`${msg.discord.author},
						I've renamed the group "${parseFirstArgs.newContent}" into
						"${parseSecondArg.newContent}", and changed the emote to
						"${parseSecondArg.newEmote}" successfully!`);
					} else {
						await msg.discord?.channel
							.send(oneLine`${msg.discord.author},
						I've renamed the group "${parseFirstArgs.newContent}" into
						"${parseSecondArg.newContent}" successfully!`);
					}
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(
							`${msg.discord.author}, ${error.message}`
						);
					} else {
						Logger.error(error.stack);
					}
					return false;
				}
			} else {
				await msg.sendHelpForCommand();
				return false;
			}

			return true;
		}
		return false;
	}
}
