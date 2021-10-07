import {
	BaseCommand,
	BaseMessage,
	FriendlyError,
	Logger,
	Place,
} from "@framedjs/core";
import { BaseSubcommand } from "@framedjs/core";
import { oneLine } from "common-tags";
import { CustomClient } from "../../../../../structures/CustomClient";
import CustomCommand from "../CustomCommand";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "delete",
			aliases: ["del", "d", "remove", "rm"],
			about: "Deletes a custom command.",
			examples: `\`{{prefix}}command {{id}} newcommand\``,
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
				const { newCommandId } = parse;
				return (
					(await this.deleteCommand(
						newCommandId,
						await msg.getPlace(true),
						msg
					)) != undefined
				);
			}
		}

		await msg.sendHelpForCommand();
		return false;
	}

	/**
	 * Deletes a command.
	 *
	 * @param newCommandId Command ID string
	 * @param place Place data. Should try to use non-default ID
	 * @param msg Message object
	 */
	async deleteCommand(
		newCommandId: string,
		place: Place,
		msg?: BaseMessage,
		silent?: boolean
	): Promise<void> {
		if (!(this.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		const parse = await CustomCommand.customParseCommand(
			this.client.database,
			newCommandId,
			place,
			undefined,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await msg.sendHelpForCommand();
			}
			return;
		}

		const prefix = parse.prefix;
		const command = parse.command;
		const response = parse.oldResponse;

		if (!command) {
			if (msg && !silent) {
				msg.discord?.channel.send(
					`${msg.discord.author}, the comamnd doesn't exist!`
				);
				return;
			}
		} else if (!response) {
			// If there's no response, if newContents is undefined
			Logger.error(
				"No response returned for CustomCommand.ts deleteCommand()!"
			);
			return undefined;
		} else {
			// Checks if the command exists
			if (command) {
				// Tries and deletes the command
				try {
					await this.client.database.deleteCommand(command.id);

					// Tries and deletes the response
					// TODO: don't delete the command if there's anything else connected to it
					if (
						response.commandResponses &&
						response.commandResponses.length <= 1
					) {
						try {
							await this.client.database.deleteResponse(
								response.id
							);
						} catch (error) {
							Logger.error(
								`Failed to delete response\n${(error as Error).stack}`
							);
						}
					}
				} catch (error) {
					// Outputs error
					Logger.error(`${(error as Error).stack}`);
					return undefined;
				}

				// If the command was valid, and (probably) didn't error out
				if (command) {
					if (msg?.discord) {
						await msg.discord.channel.send(
							`${msg.discord.author}, I've deleted the \`${prefix.prefix}${command.id}\` command.`
						);
					}
				}
			} else {
				if (msg && !silent) {
					await msg?.discord?.channel.send(
						`${msg.discord.author}, the command doesn't exists!`
					);
				}
				return undefined;
			}
		}
	}
}
