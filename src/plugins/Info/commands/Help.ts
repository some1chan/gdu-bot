/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	EmbedHelper,
	HelpData,
	FriendlyError,
	InlineOptions,
	Logger,
	Place,
} from "@framedjs/core";
import { oneLine, oneLineInlineLists, stripIndents } from "common-tags";
import { CustomClient } from "../../../structures/CustomClient";

const data: HelpData[] = [
	{
		group: "Dailies",
		commands: [
			"alert",
			"casual",
			"dailies",
			"day",
			"streaks",
			"streaks all",
			"streaks top",
			"togglewarnings",
			"vacation",
		],
	},
];

export default class Help extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
			aliases: ["h", "commands"],
			about: "View help for certain commands and extra info.",
			description: stripIndents`
			Shows a list of useful commands, or detail specific commands for you.
			`,
			usage: "[command]",
			examples: stripIndents`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} poll\`
			\`{{prefix}}{{id}} dailies\`
			`,
			inline: true,
			botPermissions: {
				discord: {
					permissions: ["EMBED_LINKS", "SEND_MESSAGES"],
				},
			},
		});
	}
	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args) {
			if (msg.args[0]) {
				// Sends help through Embed
				if (msg.discord) {
					const embeds = await Help.sendHelpForCommand(
						msg.args,
						msg,
						this.id
					);
					await msg.discord.channel.send({ embeds });
				}

				return true;
			} else {
				return this.showHelpAll(msg);
			}
		}
		return false;
	}

	/**
	 * Shows the help message for all commands
	 * @param msg Framed message
	 */
	private async showHelpAll(msg: BaseMessage): Promise<boolean> {
		const helpFields = await this.client.plugins.createHelpFields(
			data,
			await msg.getPlace()
		);

		if (msg.discord && helpFields) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Command Help")
				.setDescription(
					await BaseMessage.format(
						stripIndents`
						For info about this bot, use the \`$(command about)\` command.
						For info on certain commands, use \`$(command help) [command]\`, excluding brackets.
						`,
						this.client,
						await msg.getPlace()
					)
				)
				.addFields(helpFields);

			await msg.discord.channel.send({ embeds: [embed] });
			return true;
		}
		return false;
	}

	/**
	 * Show help message for a command
	 *
	 * @param args Message arguments
	 * @param msg Framed Message
	 * @param id Command ID for embed
	 * @param createHelpEmbed The function that will parse and create all embeds.
	 */
	static async sendHelpForCommand(
		args: string[],
		msg: BaseMessage,
		id: string,
		createHelpEmbed: (
			msg: BaseMessage,
			id: string,
			newArgs: string[],
			command: BaseCommand,
			place: Place
		) => Promise<Discord.MessageEmbed | undefined> = Help.createHelpEmbed
	): Promise<Discord.MessageEmbed[]> {
		if (!(msg.client instanceof CustomClient)) {
			Logger.error(
				"CustomClient is needed! This code needs a reference to DatabaseManager"
			);
			throw new FriendlyError(
				oneLine`The bot wasn't configured correctly!
				Contact one of the developers about this issue.`
			);
		}

		if (msg.discord && args[0]) {
			const embeds: Discord.MessageEmbed[] = [];

			// Does a shallow clone of the array
			const newArgs = [...args];
			const command = newArgs.shift();

			const place = await msg.getPlace();

			if (command) {
				// Goes through all matching commands. Hopefully, there's only one, but
				// this allows for edge cases in where two plugins share the same command.
				const matchingCommands = msg.client.commands.getCommands(
					command,
					place
				);

				// Renders all potential help
				for (const baseCommand of matchingCommands) {
					const embed = await createHelpEmbed(
						msg,
						id,
						newArgs,
						baseCommand,
						place
					);
					if (embed) embeds.push(embed);
				}

				// Handles database commands
				const dbCommand = await msg.client.database.findCommand(
					command,
					msg.client.defaultPrefix,
					place
				);
				if (dbCommand) {
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, id)
					);
					// Shows the command/subcommand chain
					// ex. .command add
					const commandRan = `${dbCommand.defaultPrefix.prefix}${dbCommand.id}`;
					embed.setTitle(commandRan);

					// Get the description
					let description = dbCommand.response.description;
					if (!description) {
						description = `*No about or description set for the command.*`;
					}
					embed.setDescription(description);

					embeds.push(embed);
				}
			}

			// Handles all the $() formatting all at once
			const processingEmbeds: Promise<Discord.MessageEmbed>[] = [];
			for (const embed of embeds) {
				processingEmbeds.push(
					msg.client.formatting.formatEmbed(embed, place)
				);
			}
			const processedEmbeds = await Promise.allSettled(processingEmbeds);
			const readyEmbeds: Discord.MessageEmbed[] = [];
			for (const embed of processedEmbeds) {
				switch (embed.status) {
					case "rejected":
						Logger.error(embed.reason);
						break;
					default:
						readyEmbeds.push(embed.value);
						break;
				}
			}

			return readyEmbeds;
		}

		return [];
	}

	/**
	 * Creates embeds containing help data
	 *
	 * @param msg Framed Message
	 * @param id Command ID for embed
	 * @param newArgs Message arguments
	 * @param command BaseCommand
	 */
	static async createHelpEmbed(
		msg: BaseMessage,
		id: string,
		newArgs: string[],
		command: BaseCommand,
		place: Place
	): Promise<Discord.MessageEmbed | undefined> {
		if (!msg.discord) return undefined;

		const embed = EmbedHelper.getTemplate(
			msg.discord,
			await EmbedHelper.getCheckOutFooter(msg, id)
		);

		// Get potential subcommand
		const subcommands = command.getSubcommandChain(newArgs);
		const finalSubcommand = subcommands[subcommands.length - 1];

		// Get the IDs fo all of them
		const subcommandIds: string[] = [];
		subcommands.forEach(subcommand => {
			subcommandIds.push(subcommand.id);
		});

		// Shows the command/subcommand chain
		// ex. .command add
		const commandRan = `${command.getDefaultPrefix(place)}${
			command.id
		} ${oneLineInlineLists`${subcommandIds}`}`.trim();
		embed.setTitle(commandRan);

		// The command/subcommand that has the data needed
		const primaryCommand = finalSubcommand ?? command;

		let { about, description, examples, notes, usage } =
			primaryCommand.getCommandNotationFormatting(place);

		// Get the description
		if (!description) {
			if (about) {
				description = about;
			} else {
				description = `*No about or description set for the command.*`;
			}
		}
		embed.setDescription(description);

		// Gets the usage text
		if (usage) {
			const guideMsg = `Type \`$(command default.bot.info usage)\` for more info.`;
			const usageMsg = `\`${commandRan} ${usage}\``;
			embed.addField(
				"Usage",
				`${guideMsg}\n${usageMsg}`,
				Help.useInline(primaryCommand, "usage")
			);
		}

		// Get the examples text
		if (examples) {
			embed.addField(
				"Examples",
				`Try copying and editing them!\n${examples}`,
				Help.useInline(primaryCommand, "examples")
			);
		}

		// Get the notes text
		if (notes) {
			embed.addField(
				"Notes",
				notes,
				Help.useInline(primaryCommand, "notes")
			);
		}

		return msg.client.formatting.formatEmbed(embed, place);
	}

	/**
	 * Use inline
	 * @param command
	 * @param index
	 */
	static useInline(
		command: BaseCommand,
		index: keyof InlineOptions
	): boolean {
		// If the whole this is set to a true/false value, return that
		if (typeof command.inline == "boolean") {
			return command.inline;
		}

		// Object means it's InlineOptions
		if (typeof command.inline == "object") {
			const enableAllUnlessSpecified =
				command.inline.enableAllUnlessSpecified;
			const inlineValue = command.inline[index];

			// If enableAllUnlessSpecified is true, everything should pass as true,
			// unless the inline value has been set to false (not true or undefined)
			if (enableAllUnlessSpecified) {
				return inlineValue != false;
			} else {
				// Return like normal
				return inlineValue == true;
			}
		}

		// If command.inline isn't set/was undefined, return false
		return false;
	}
}
