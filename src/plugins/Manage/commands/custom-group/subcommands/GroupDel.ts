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
			id: "delete",
			aliases: ["del", "remove"],
			about: "Deletes a custom group.",
			usage: `"<group>"`,
			hideUsageInHelp: true,
			examples: oneLine`
			\`{{prefix}}group {{id}} "Food"\``,
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
			const parse = BaseMessage.parseEmojiAndString(msg, [msg.args[0]]);
			if (parse) {
				const { newContent } = parse;
				try {
					await this.client.database.deleteGroup(newContent);

					await msg.discord?.channel.send(
						`${msg.discord.author}, I've deleted the group "${newContent}" succesfully!`
					);
				} catch (error) {
					if (
						error instanceof ReferenceError ||
						(error.message as string).includes("default group")
					) {
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
