/* eslint-disable no-mixed-spaces-and-tabs */
import { EmbedHelper, Message, BasePlugin, BaseCommand, Logger } from "framed.js";
import { oneLineInlineLists, stripIndent } from "common-tags";
import { HelpData } from "framed.js";
import Discord from "discord.js";

const data: HelpData[] = [
	{
		group: "Info",
		// TODO: Sorting alphabetically should probably be done programatically
		// commands: ["help", "usage", "info", "about", "ping"],
		commands: ["about", "help", "ping"],
	},
	{
		group: "Dailies",
		// commands: ["dailies", "streaks", "alert", "casual"],
		commands: [
			"alert",
			"casual",
			"dailies",
			"streaks",
			"streaks all",
			"streaks top",
		],
	},
	{
		group: "Fun",
		commands: ["8ball", "poll"],
	},
	{
		group: "Manage",
		commands: ["suggest"],
	},
];

export default class Help extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "help",
			aliases: ["h", "commands"],
			about: "View help for certain commands and extra info.",
			description: stripIndent`
			Shows a list of useful commands, or detail specific commands for you.
			`,
			usage: "[command]",
			examples: stripIndent`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} poll\`
			\`{{prefix}}{{id}} dailies\`
			`,
			inline: true,
		});
	}

	async run(msg: Message): Promise<boolean> {
		if (msg.args) {
			if (msg.args[0]) {
				// Sends help through Embed
				if (msg.discord) {
					const embeds = await Help.showHelpCommand(
						msg.args,
						msg,
						this.id,
						Help.getHelpEmbed
					);
					for await (const embed of embeds) {
						await msg.discord.channel.send(embed);
					}
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
	private async showHelpAll(msg: Message): Promise<boolean> {
		const helpFields = await this.client.plugins.createHelpFields(
			data
		);

		if (msg.discord && helpFields) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				this.client.helpCommands,
				this.id
			)
				.setTitle("Command Help")
				.setDescription(
					await Message.format(
						stripIndent`
						For info about this bot, use the \`$(command about)\` command.
						For info on certain commands, use \`$(command help) [command]\`, excluding brackets.
						`,
						this.client
					)
				)
				.addFields(helpFields)
				.addField(
					"🤖 Other Bots",
					stripIndent`
					\`-help\` - <@234395307759108106> is used for music in the **<#760622055384547368>** voice channel.
					`
				);
			// .addField(
			// 	"Need a Custom Discord Bot?",
			// 	oneLine`
			// 		Send <@200340393596944384> a message on Discord!`
			// );

			try {
				await msg.discord.channel.send(embed);
			} catch (error) {
				Logger.error(error.stack);
				await msg.discord.channel.send(
					`${msg.discord.author}, the embed size for help is too large! Contact one of the bot masters.`
				);
			}
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
	 * @param processFunction The function that will parse and create all embeds.
	 */
	static async showHelpCommand(
		args: string[],
		msg: Message,
		id: string,
		processFunction: (
			msg: Message,
			id: string,
			newArgs: string[],
			command: BaseCommand
		) => Promise<Discord.MessageEmbed | undefined>
	): Promise<Discord.MessageEmbed[]> {
		const embeds: Discord.MessageEmbed[] = [];
		if (msg.discord && args[0]) {
			// Does a shallow clone of the array
			const newArgs = [...args];
			const command = newArgs.shift();

			if (command) {
				// Goes through all matching commands. Hopefully, there's only one, but
				// this allows for edge cases in where two plugins share the same command.
				const matchingCommands = msg.client.plugins.getCommands(
					command
				);

				for (const baseCommand of matchingCommands) {
					const embed = await processFunction(
						msg,
						id,
						newArgs,
						baseCommand
					);
					if (embed) embeds.push(embed);
				}

				// Handles database commands
				const dbCommand = await msg.client.database.findCommand(
					command,
					msg.client.defaultPrefix
				);
				if (dbCommand) {
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						msg.client.helpCommands,
						id
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
		}
		return embeds;
	}

	/**
	 * Creates embeds containing help data
	 *
	 * @param msg Framed Message
	 * @param id Command ID for embed
	 * @param newArgs Message arguments
	 * @param command BaseCommand
	 */
	static async getHelpEmbed(
		msg: Message,
		id: string,
		newArgs: string[],
		command: BaseCommand
	): Promise<Discord.MessageEmbed | undefined> {
		if (!msg.discord) return undefined;

		const embed = EmbedHelper.getTemplate(
			msg.discord,
			msg.client.helpCommands,
			id
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
		const commandRan = `${command.defaultPrefix}${
			command.id
		} ${oneLineInlineLists`${subcommandIds}`}`.trim();
		embed.setTitle(commandRan);

		// The command/subcommand that has the data needed
		const primaryCommand = finalSubcommand ? finalSubcommand : command;

		// Get the description
		let description = primaryCommand.description;
		if (!description) {
			if (primaryCommand.about) {
				description = primaryCommand.about;
			} else {
				description = `*No about or description set for the command.*`;
			}
		}
		embed.setDescription(description);

		// Gets the usage text
		if (primaryCommand.usage) {
			const guideMsg = await Message.format(
				`Type \`$(command default.bot.info usage)\` for important info.`,
				msg.client
			);
			const usageMsg = `\`${commandRan} ${primaryCommand.usage}\``;
			embed.addField(
				"Usage",
				`${guideMsg}\n${usageMsg}`,
				Help.useInline(primaryCommand, usageMsg)
			);
		}

		// Get the examples text
		if (primaryCommand.examples) {
			embed.addField(
				"Examples",
				`Try copying and editing them!\n${primaryCommand.examples}`,
				Help.useInline(primaryCommand, primaryCommand.examples)
			);
		}

		return embed;
	}

	static useInline(command: BaseCommand, newString: string): boolean {
		return command.inlineCharacterLimit
			? newString.length <= command.inlineCharacterLimit
			: command.inline;
	}
}
