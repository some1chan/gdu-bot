import {
	Client,
	CommandManager,
	Logger,
	BaseMessage,
	Utils,
} from "@framedjs/core";
import { DatabaseManager } from "./DatabaseManager";
import Command from "../database/entities/Command";
import Discord from "discord.js";
import util from "util";

export class CustomCommandManager extends CommandManager {
	database: DatabaseManager;

	constructor(client: Client, databaseManager: DatabaseManager) {
		super(client);
		this.database = databaseManager;
	}

	/**
	 * List of all the default prefixes
	 *
	 * @returns String array of default prefixes
	 */
	get defaultPrefixes(): string[] {
		const prefixes: string[] = [
			`<@!${this.client.discord.client?.user?.id}>`,
			`<@${this.client.discord.client?.user?.id}>`,
			`@${this.client.discord.client?.user?.username}`,
			`@${this.client.discord.client?.user?.tag}`,
			`${this.client.discord.client?.user?.tag}`,
		];

		// Logger.debug(`Default prefixes: ${prefixes}`);
		return prefixes;
	}

	/**
	 * Runs a command, based on the Message parameters
	 * @param msg Message object
	 */
	async run(msg: BaseMessage): Promise<Map<string, boolean>> {
		const startTime = process.hrtime();

		// Handles BaseCommand and BaseSubcommands, and stores the results in a variable
		const map = await super.run(msg);

		// If the author is a bot, we ignore their command.
		if (msg.discord?.author.bot) {
			return map;
		}

		try {
			if (msg.prefix && msg.command) {
				const place = await msg.getPlace();
				if (place) {
					// Attempts to runs commands through database
					const dbCommand: Command | undefined =
						await this.database.findCommand(
							msg.command,
							msg.prefix,
							place
						);

					if (dbCommand) {
						Logger.debug(
							`Running database command ${dbCommand.id}`
						);
						const success = await this.sendDatabaseCommand(
							dbCommand,
							msg
						);
						map.set(dbCommand.id, success);
					}
				}
			}
		} catch (error) {
			Logger.error((error as Error).stack);
		}

		Logger.debug(
			`${Utils.hrTimeElapsed(
				startTime
			)}s - Finished checking for database commands`
		);
		return map;
	}

	/**
	 * Sends a command from the database into chat.
	 *
	 * @param dbCommand Command entity
	 * @param msg Framed message object
	 *
	 * @returns true, if there was a database command to send.
	 */
	async sendDatabaseCommand(
		dbCommand: Command,
		msg: BaseMessage
	): Promise<boolean> {
		const responseData = dbCommand.response.responseData;
		if (responseData) {
			const discordEmbedsExist = responseData.list.some(
				data => data.discord?.embeds != undefined
			);

			if (msg.twitch) {
				if (discordEmbedsExist) {
					return false;
				}
			}

			let sentSomething = false;

			if (msg.discord) {
				for await (const data of responseData.list) {
					const place = await msg.getPlace();
					const embeds = data.discord?.embeds;

					for (let i = 0; i < (embeds?.length ?? 1); i++) {
						// Gets the embed if it exists
						let embed: Discord.MessageEmbed | undefined;
						if (embeds) {
							const embedData = embeds[i];
							if (embedData) {
								embed = new Discord.MessageEmbed(embedData);
							}

							if (embed) {
								embed =
									await this.client.formatting.formatEmbed(
										embed,
										place
									);
							}
						}

						// If it's the first embed, and data content is a thing
						if (i == 0 && data.content && data.content.length > 0) {
							const formattedContent = await BaseMessage.format(
								data.content,
								this.client,
								place
							);

							// If there's an embed, send it. If not, don't
							if (embed) {
								await msg.discord.channel.send({
									content: formattedContent,
									embeds: [embed],
								});
								sentSomething = true;
							} else {
								await msg.discord.channel.send(
									formattedContent
								);
								sentSomething = true;
							}
						} else if (embed) {
							// If there is an embed but no content, send the embed
							await msg.discord.channel.send({ embeds: [embed] });
							sentSomething = true;
						} else {
							// If there's no embed or content, somethign went wrong
							Logger.error(
								`Response data doesn't contain anything to output\n${util.inspect(
									data
								)}`
							);
						}
					}

					return sentSomething;
				}
			} else {
				for await (const data of responseData.list) {
					if (data.content) {
						await msg.send(data.content);
						sentSomething = true;
					}
				}
				return sentSomething;
			}
		} else {
			Logger.error(
				`PluginManager tried to output the response data, but there was none!`
			);
		}
		return false;
	}
}
