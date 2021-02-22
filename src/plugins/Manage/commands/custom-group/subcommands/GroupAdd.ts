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
			id: "add",
			aliases: ["a", "create", "cr"],
			about: "Adds a custom group.",
			usage: `"<[emote] group>"`,
			hideUsageInHelp: true,
			examples: oneLine`
			\`{{prefix}}group {{id}} "🍎 Food Stuff"\``,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (!(this.client instanceof CustomClient)) {
			Logger.error("CustomClient is needed! This code needs a reference to DatabaseManager");
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		if (msg.args) {
			const parse = BaseMessage.parseEmojiAndString(msg, [msg.args[0]]);
			if (parse) {
				const { newContent, newEmote } = parse;
				try {
					await this.client.database.addGroup(newContent, newEmote);

					if (newEmote) {
						await msg.discord?.channel.send(
							oneLine`${msg.discord.author}, I've added the group "${newContent}" with
							emote "${newEmote}" succesfully!`
						);
					} else {
						await msg.discord?.channel.send(
							`${msg.discord.author}, I've added the group "${newContent}" succesfully!`
						);
					}
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
