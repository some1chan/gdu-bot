import { Command, EmbedHelper, Message, PluginManager, Logger } from "framed.js";
import { BaseCommand } from "framed.js";
import { BaseSubcommand } from "framed.js";
import { oneLine, oneLineInlineLists } from "common-tags";

import CustomCommand from "../CustomCommand";

interface Data {
	noDescCommands: string[];
	descCommands: string[];
}

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "list",
			aliases: ["ls", "l", "show"],
			about: "Lists all the custom commands.",
		});
	}

	async run(msg: Message): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.discord) {
			const embed = EmbedHelper.getTemplate(msg.discord, this.client.helpCommands, this.id)
				.setTitle("Command List")
				.setDescription(
					await Message.format(
						oneLine`
						This is a list of custom commands.
						To see the rest of the commands, use \`$(command default.bot.info help)\`.`,
						this.client
					)
				);
			const databaseManager = this.client.database;
			const connection = databaseManager.connection;

			if (!connection) {
				Logger.error("no connection");
				return false;
			}

			const commandRepo = connection.getRepository(Command);
			const commands = await commandRepo.find({
				relations: ["defaultPrefix", "group", "response"],
			});
			const groupMap = new Map<string, Data>();

			// Finds all commands, and adds them into an interface that contains both
			// Description commands and no-description commands
			for await (const command of commands) {
				const groupEmote = command.group ? command.group.emote : "❔";
				const groupDisplay = `${groupEmote} ${
					command.group ? command.group.name : "Unknown (An Error Occured!)"
				}`;
				const description = command.response.description
					? ` - ${command.response.description}`
					: ``;
				const small = command.response.description == undefined;

				const finalOutput = `\`${command.defaultPrefix.prefix}${command.id}\`${description}`;
				let foundGroup = groupMap.get(groupDisplay);
				if (!foundGroup) {
					foundGroup = {
						descCommands: [],
						noDescCommands: [],
					};
				}

				if (small) {
					foundGroup.noDescCommands.push(finalOutput);
				} else {
					foundGroup.descCommands.push(finalOutput);
				}

				groupMap.set(groupDisplay, foundGroup);
			}

			// Creates the final display
			for (const [key, value] of groupMap) {
				const noDesc = oneLineInlineLists`${value.noDescCommands}`;
				let desc = "";
				value.descCommands.forEach(element => {
					desc += `${element}\n`;
				});
				embed.addField(key, `${desc}${noDesc}`);
			}

			await msg.discord.channel.send(embed);
			return true;
		}

		return false;
	}

	/**
	 * Deletes a command.
	 *
	 * @param newCommandId Command ID string
	 * @param msg Message object
	 */
	async deleteCommand(newCommandId: string, msg?: Message, silent?: boolean): Promise<void> {
		const parse = await CustomCommand.customParseCommand(
			this.client.database,
			newCommandId,
			undefined,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.sendHelpForCommand(msg);
			}
			return;
		}

		const prefix = parse.prefix;
		const command = parse.command;
		const response = parse.oldResponse;

		if (!command) {
			if (msg && !silent) {
				msg.discord?.channel.send(`${msg.discord.author}, the comamnd doesn't exist!`);
				return;
			}
		} else if (!response) {
			// If there's no response, if newContents is undefined
			Logger.error("No response returned for CustomCommand.ts deleteCommand()!");
			return undefined;
		} else {
			// Checks if the command exists
			if (command) {
				// Tries and deletes the command
				try {
					await this.client.database.deleteCommand(command.id);

					// Tries and deletes the response
					// TODO: don't delete the command if there's anything else connected to it
					if (response.commandResponses && response.commandResponses.length <= 1) {
						try {
							await this.client.database.deleteResponse(response.id);
						} catch (error) {
							Logger.error(`Failed to delete response\n${error.stack}`);
						}
					}
				} catch (error) {
					// Outputs error
					Logger.error(`${error.stack}`);
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
