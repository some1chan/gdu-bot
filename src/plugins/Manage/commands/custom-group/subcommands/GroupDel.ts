import { Message, BaseCommand, BaseSubcommand, PluginManager, Logger } from "@framedjs/core";
import { oneLine } from "common-tags";

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

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (!this.baseCommand.hasPermission(msg, this.baseCommand.permissions)) {
			this.baseCommand.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			const parse = Message.parseEmojiAndString(msg, [msg.args[0]]);
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
