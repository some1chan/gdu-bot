import {
	Command,
	Message,
	PluginManager,
	BaseCommand,
	BaseSubcommand,
	Logger,
} from "framed.js";
import { stripIndents } from "common-tags";
import CustomCommand from "../CustomCommand";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add",
			aliases: ["a", "create", "cr"],
			about: "Adds a custom command.",
			examples: stripIndents`
			\`{{prefix}}command {{id}} newcommand This is a test message.\`
			\`{{prefix}}command {{id}} newcommand Test message! "Test description!"\`
			`,
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
			const parse = CustomCommand.customParse(
				msg.prefix,
				msg.command,
				msg.content,
				msg.args
			);
			if (parse) {
				const { newCommandId, newArgs } = parse;
				return this.addCommand(newCommandId, newArgs, msg);
			}
		}

		await PluginManager.sendHelpForCommand(msg);
		return false;
	}

	/**
	 * Adds a command.
	 *
	 * @param newCommandId Command ID string
	 * @param newContents Contents to add, in an array
	 * @param msg Message object
	 *
	 * @returns New command
	 */
	async addCommand(
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
			Logger.error(
				"No response returned for CustomCommand.ts addCommand()!"
			);
			return false;
		}

		// Checks if the command already exists
		const commandRepo = connection.getRepository(Command);
		if (command) {
			if (msg && !silent) {
				await msg?.discord?.channel.send(
					`${msg.discord.author}, the command already exists!`
				);
			}
			return false;
		}

		// Tries and writes the command. If it fails,
		// send an error message to console and delete the new response data.
		const defaultGroup = await this.client.database.getDefaultGroup();
		try {
			command = commandRepo.create({
				id: newCommandId.toLocaleLowerCase(),
				response: response,
				group: defaultGroup,
				defaultPrefix: prefix,
				prefixes: [prefix],
			});

			command = await commandRepo.save(command);
		} catch (error) {
			try {
				await this.client.database.deleteResponse(response.id);
			} catch (error) {
				Logger.error(`Failed to delete response\n${error.stack}`);
			}
			Logger.error(`Failed to add command\n${error.stack}`);
			return false;
		}

		// If the command was valid, and (probably) didn't error out
		if (command) {
			if (msg?.discord) {
				await msg.discord.channel.send(
					`${msg.discord.author}, I've added the \`${prefix.prefix}${command.id}\` command.`
				);
			}
			return true;
		}

		return false;
	}
}
