import {
	EmbedHelper,
	Logger,
	FriendlyError,
	BaseCommand,
	BaseMessage,
	BaseSubcommand,
} from "@framedjs/core";
import { oneLine, oneLineInlineLists } from "common-tags";
import { Message } from "discord.js";
import Command from "../../../../../database/entities/Command";
import { CustomClient } from "../../../../../structures/CustomClient";

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

	async run(msg: BaseMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg)) {
			await this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (!(this.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		if (msg.discord) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Command List")
				.setDescription(
					await BaseMessage.format(
						oneLine`
						This is a list of custom commands.
						To see the rest of the commands, use \`$(command default.bot.info help)\`.`,
						this.client,
						await msg.getPlace()
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
				const groupEmote = command.group?.emote ?? "❔";
				const groupDisplay = `${groupEmote} ${
					command.group
						? command.group.name
						: "Unknown (An Error Occured!)"
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
}
