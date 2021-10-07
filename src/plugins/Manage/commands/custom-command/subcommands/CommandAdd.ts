import {
	BaseMessage,
	BaseCommand,
	BaseSubcommand,
	Logger,
	Place,
	FriendlyError,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";
import CustomCommand from "../CustomCommand";
import { CustomClient } from "../../../../../structures/CustomClient";
import Command from "../../../../../database/entities/Command";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add",
			aliases: ["a", "create", "cr"],
			about: "Adds a custom command.",
			examples: stripIndents`
			\`$(command default.bot.manage command add) newcommand This is a test message.\`
			\`$(command default.bot.manage command add) newcommand Test message! "Test description!"\`
			`,
			hideUsageInHelp: true,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasUserPermission(msg)) {
			await this.sendUserPermissionErrorMessage(msg);
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
				return this.addCommand(
					newCommandId,
					newArgs,
					await msg.getPlace(true),
					msg
				);
			}
		}

		await msg.sendHelpForCommand();
		return false;
	}

	/**
	 * Adds a command.
	 *
	 * @param newCommandId Command ID string
	 * @param newContents Contents to add, in an array
	 * @param place Place data. Should try to use non-default ID
	 * @param msg Message object
	 * @param silent
	 *
	 * @returns New command
	 */
	async addCommand(
		newCommandId: string,
		newContents: string[],
		place: Place,
		msg?: BaseMessage,
		silent?: boolean
	): Promise<boolean> {
		if (!(this.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		const connection = this.client.database.connection;
		if (!connection) {
			Logger.error("No connection to a database found!");
			return false;
		}

		const parse = await CustomCommand.customParseCommand(
			this.client.database,
			newCommandId,
			place,
			newContents,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await msg.sendHelpForCommand();
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
				placeId: place.id,
				platform: place.platform,
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
				Logger.error(`Failed to delete response\n${(error as Error).stack}`);
			}
			Logger.error(`Failed to add command\n${(error as Error).stack}`);
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
