import { Command, Message, PluginManager, Logger } from "framed.js";
import { BaseCommand } from "framed.js";
import { BaseSubcommand } from "framed.js";
import { stripIndents } from "common-tags";
import CustomCommand from "../CustomCommand";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "edit",
			aliases: ["e", "change", "ch"],
			about: "Edits a custom command.",
			examples: stripIndents`
			\`{{prefix}}command {{id}} newcommand This has been edited.\`
			\`{{prefix}}command {{id}} newcommand Edited message! "Edited description"\`
			\`{{prefix}}command {{id}} newcommand This will have no description! ""\``,
			hideUsageInHelp: true,
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.command && msg.args && msg.prefix && msg.args.length > 0) {
			const parse = CustomCommand.customParse(msg.prefix, msg.command, msg.content, msg.args);
			if (parse) {
				const { newCommandId, newArgs } = parse;
				return this.editCommand(newCommandId, newArgs, msg);
			}
		}

		await PluginManager.sendHelpForCommand(msg);
		return false;
	}

	/**
	 * Edits a command.
	 *
	 * @param newCommandId Command ID string
	 * @param newContents Contents to add, in an array. If undefined, the response
	 * will be generated through
	 * @param msg Message object
	 *
	 * @returns Edited command
	 */
	async editCommand(
		newCommandId: string,
		newContents: string[],
		msg?: Message,
		silent?: boolean
	): Promise<boolean> {
		const connection = this.client.database.connection;
		if (!connection) {
			Logger.error("No connection to a database found!");
			return false;
		}

		const parse = await CustomCommand.customParseCommand(
			this.client.database,
			newCommandId,
			newContents,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.sendHelpForCommand(msg);
			}
			return false;
		}

		const prefix = parse.prefix;
		let command = parse.command;
		const response = parse.newResponse;

		// If there's no response, if newContents is undefined
		if (!response) {
			Logger.error("No response returned for CustomCommand.ts editCommand()!");
			return false;
		}

		// Checks if the command exists
		if (command) {
			// Tries and writes the command. If it fails,
			// send an error message to console and delete the new response data.
			const commandRepo = connection.getRepository(Command);
			try {
				command = commandRepo.create({
					id: newCommandId.toLocaleLowerCase(),
					response: response,
				});

				command.defaultPrefix = prefix;
				command.prefixes = [prefix];

				command = await commandRepo.save(command);
			} catch (error) {
				// Outputs error
				Logger.error(`${error.stack}`);
			}

			// If the command was valid, and (probably) didn't error out
			if (command) {
				if (msg?.discord) {
					await msg.discord.channel.send(
						`${msg.discord.author}, I've edited the \`${prefix.prefix}${command.id}\` command.`
					);
				}
				return true;
			} else {
				return false;
			}
		} else {
			if (msg && !silent) {
				await msg?.discord?.channel.send(
					`${msg.discord.author}, the command doesn't exists!`
				);
			}
			return false;
		}
	}
}
