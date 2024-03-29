/* eslint-disable no-mixed-spaces-and-tabs */

import { oneLine, stripIndents } from "common-tags";
import { SnowflakeUtil } from "discord.js";
import path from "path";
import {
	BaseCommand,
	BasePlugin,
	BaseMessage,
	DiscordUtils,
	DiscohookOutputData,
	Logger,
	Place,
} from "@framedjs/core";
import { DatabaseManager } from "../../../../managers/DatabaseManager";
import Command from "../../../../database/entities/Command";
import Prefix from "../../../../database/entities/Prefix";
import Response from "../../../../database/entities/Response";
import { ResponseData } from "../../../../database/interfaces/ResponseData";

export default class CustomCommand extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "command",
			aliases: ["customcommand", "cmd", "com"],
			about: "Manages commands.",
			description: oneLine`
			This command allows you to list, add, edit, and delete custom commands.`,
			examples: stripIndents`
			\`{{prefix}}{{id}} add newcommand This is a test message.\`
			\`{{prefix}}{{id}} edit newcommand We've edited the message! "New description!"\`
			\`{{prefix}}{{id}} delete newcommand\`
			\`{{prefix}}{{id}} list\``,
			userPermissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES"],
					// Mods, Community Manager
					roles: [
						process.env.MOD_ROLE_ID ?? "462342299171684364",
						process.env.COMMUNITY_ROLE_ID ?? "758771336289583125",
					],
				},
			},
			hideUsageInHelp: true,
			paths: {
				subcommands: path.join(__dirname, "subcommands"),
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		await msg.sendHelpForCommand();
		return false;
	}

	/**
	 * Custom parses the "add/remove/edit" part, along with
	 * getting contents into arguments.
	 *
	 * @param prefix Prefix string
	 * @param command Command string
	 * @param content Contents string
	 * @param args Arguments array of strings
	 * @param msg Message object
	 * @param slient Should the error messages not be shown in Discord?
	 *
	 * @returns Object containing variables, or fails
	 */
	static customParse(
		prefix: string,
		command: string,
		content: string,
		args: string[]
	):
		| {
				subcommand: string;
				newCommandId: string;
				newContent: string;
				newArgs: string[];
		  }
		| undefined {
		const subcommand = args[0];
		const newCommandId = args[1];

		if (subcommand && newCommandId) {
			const newContent = content
				.replace(prefix, "")
				.replace(command, "")
				.replace(subcommand, "")
				.replace(newCommandId, "")
				.trim();

			const newArgs = BaseMessage.getArgs(newContent, {
				quoteSections: "flexible",
			});

			Logger.silly(stripIndents`
				Command.ts: 
				newContent: '${newContent}'
				newArgs: '${newArgs}'
			`);

			return {
				subcommand: subcommand,
				newCommandId: newCommandId,
				newArgs: newArgs,
				newContent: newContent,
			};
		}

		return undefined;
	}

	/**
	 * Manages commands. To be used as a base for any command-related things,
	 * such as adding, editing, or removing commands.
	 *
	 * @param databaseManager
	 * @param newCommandId Command ID string
	 * @param place Place data
	 * @param newContents Contents to add, in an array
	 * @param msg Message object
	 * @param silent
	 *
	 * @returns Response and prefix entities, or undefined
	 */
	static async customParseCommand(
		databaseManager: DatabaseManager,
		newCommandId: string,
		place: Place,
		newContents?: string[],
		msg?: BaseMessage,
		silent?: boolean
	): Promise<
		| {
				prefix: Prefix;
				command?: Command;
				oldResponse?: Response;
				newResponse?: Response;
		  }
		| undefined
	> {
		const connection = databaseManager.connection;
		if (!connection) {
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		// Repositories
		const commandRepo = connection.getRepository(Command);
		const responseRepo = connection.getRepository(Response);

		// Checks if the ID is valid
		if (newCommandId.includes(" ")) {
			if (msg && !silent)
				await msg.discord?.channel.send(
					`${msg.discord.author}, a command ID cannot have spaces!`
				);
			return undefined;
		}

		const [command, defaultPrefix] = await Promise.all([
			commandRepo.findOne({
				where: {
					id: newCommandId,
				},
				relations: ["response"],
			}),
			databaseManager.getDefaultPrefix(place),
		]);

		let oldResponse: Response | undefined;
		if (command) {
			oldResponse = await responseRepo.findOne({
				where: {
					id: command.response.id,
				},
				relations: ["commandResponses"],
			});
		}

		// Uses the default prefix by default
		if (defaultPrefix) {
			let newResponse: Response | undefined;

			// If we've been given an empty message, say that it failed to parse
			if (newContents?.length == 0) {
				return undefined;
			}

			// Generates response data for adding + editing
			if (newContents) {
				// Gets the last content
				let lastContent: string | undefined =
					newContents[newContents.length - 1];

				// If the last content section is the beginning, lastContent becomes undefined,
				// and won't be used as a description.
				if (newContents.length < 2) {
					lastContent = undefined;
				}

				//
				const requests: Promise<DiscohookOutputData>[] = [];
				for (
					let i = 0;
					i < newContents.length - (lastContent ? 1 : 0);
					i++
				) {
					requests.push(
						DiscordUtils.getOutputData(newContents[i], true)
					);
				}

				const inputData: Array<string | DiscohookOutputData> = [];
				const requestResults = await Promise.allSettled(requests);
				for (let i = 0; i < requestResults.length; i++) {
					const result = requestResults[i];
					if (result.status == "fulfilled") {
						inputData.push(result.value);
					} else {
						inputData.push(newContents[i]);
					}
				}

				// Gets all possible responses, excluding the description if it exists
				const newList: ResponseData[] = [];
				for (let i = 0; i < inputData.length; i++) {
					const element = inputData[i];
					if (typeof element == "string") {
						newList.push({
							content: element,
						});
					} else {
						for (const message of element.messages) {
							newList.push({
								content: message.data.content ?? "",
								discord: {
									embeds: message.data.embeds,
								},
							});
						}
					}
				}

				if (!command) {
					// Add response, if command doesn't exist
					newResponse = await responseRepo.save(
						responseRepo.create({
							id: SnowflakeUtil.generate(new Date()),
							description: lastContent,
							responseData: {
								list: newList,
							},
							commandResponses: [command],
						})
					);
				} else {
					// Edit response
					if (oldResponse?.responseData) {
						oldResponse = responseRepo.create({
							id: oldResponse.id,
							description: lastContent,
							responseData: {
								list: newList,
							},
						});
						newResponse = await responseRepo.save(oldResponse);
					} else {
						throw new Error(
							"oldResponse.responseData is undefined"
						);
					}
				}
			}

			return {
				prefix: defaultPrefix,
				command: command,
				oldResponse: oldResponse,
				newResponse: newResponse,
			};
		} else {
			throw new ReferenceError("Couldn't find prefix!");
		}
	}
}
