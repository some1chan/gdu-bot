import {
	BaseMessage,
	BaseCommand,
	BaseSubcommand,
	Logger,
	FriendlyError,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import { CustomClient } from "../../../../../structures/CustomClient";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "set",
			about: "Sets a custom command to a group.",
			usage: `<command> "<group>"`,
			hideUsageInHelp: true,
			examples: oneLine`
			\`{{prefix}}group {{id}} newcommand "Food Stuff"\``,
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

		const place = await msg.getPlace();
		const prefix = msg.client.provider.prefixes.get(place.id);

		if (!prefix) {
			Logger.error("Prefix couldn't be found");
			throw new FriendlyError(
				oneLine`${msg.discord?.author}, I couldn't find the default prefix!
				If this issue persists, please report this.`
			);
		}

		if (msg.args && prefix) {
			const argsContent = msg.getArgsContent([msg.args[0]]);
			const parse = BaseMessage.getArgs(argsContent, {
				quoteSections: "flexible",
			});

			// If there's no first or second argument, show help
			if (parse.length < 2) {
				await msg.sendHelpForCommand();
				return false;
			}

			const parseFirstArgs = parse[0];
			const parseSecondArg = BaseMessage.parseEmojiAndString(parse[1], []);

			if (parseFirstArgs && parseSecondArg) {
				const command = this.client.database.findCommand(
					parseFirstArgs,
					prefix,
					place
				);

				if (!command) {
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
					I couldn't find a command with the name "${parseFirstArgs}"
					to edit. Please make sure that the command exists.`);
					return false;
				}

				if (!parseSecondArg) {
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
					I couldn't find a group with the name "${parse[1]}"
					to edit. Please make sure that the group exists.`);
					return false;
				}

				const { newContent } = parseSecondArg;
				try {
					await this.client.database.setGroup(
						parseFirstArgs,
						newContent,
						place
					);
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
					I've set the command "${parseFirstArgs}" to group "${newContent}" successfully!`);
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(
							`${msg.discord.author}, ${error.message}`
						);
					} else {
						Logger.error(error);
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
