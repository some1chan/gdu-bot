/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
} from "@framedjs/core";
import { oneLine, oneLineInlineLists, stripIndent } from "common-tags";
import Help from "./Help";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "info",
			aliases: ["i", "analyze", "inspect"],
			about: `Similar to \`$(command default.bot.info help)\`, but with more detail (ex. aliases).`,
			description: oneLine`
			Analyzes commands in more detail than \`$(command default.bot.info help)\`.
			This includes aliases, prefixes, and plugin IDs.
			`,
			usage: "[command]",
			examples: stripIndent`
			\`{{prefix}}{{id}} help\`
			\`{{prefix}}{{id}} streaks\`
			`,
			inline: true,
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args) {
			if (msg.args[0]) {
				// Send info through Embed
				if (msg.discord) {
					const embeds = await Help.sendHelpForCommand(
						msg.args,
						msg,
						this.id,
						this.getHelpEmbed
					);
					for await (const embed of embeds) {
						await msg.discord.channel.send(embed);
					}
				}
			} else {
				await msg.sendHelpForCommand();
			}
		}
		return false;
	}

	/**
	 * Creates embeds containing help data
	 * @param msg Framed Message
	 * @param id Command ID for embed
	 * @param newArgs Message arguments
	 * @param command BaseCommand
	 */
	private async getHelpEmbed(
		msg: BaseMessage,
		id: string,
		newArgs: string[],
		command: BaseCommand
	): Promise<Discord.MessageEmbed | undefined> {
		const embed = await Help.createHelpEmbed(
			msg,
			id,
			newArgs,
			command,
			await msg.getPlace()
		);

		if (!msg.discord || !embed) return undefined;

		// Handles adding aliases
		if (command.aliases) {
			let aliasString = "";
			const newElementCharacter = command.inline ? "\n" : " ";

			for (const alias of command.aliases) {
				aliasString += `\`${alias}\`${newElementCharacter}`;
			}
			if (aliasString.length > 0) {
				embed.addField(
					"Aliases",
					aliasString,
					Help.useInline(command, "aliases")
				);
			}
		}

		// Handles prefixes
		const prefixesStrings: string[] = [];
		command.getPrefixes(await msg.getPlace()).forEach(prefix => {
			prefixesStrings.push(`\`${prefix}\``);
		});
		const prefixString = oneLineInlineLists`${prefixesStrings}`;
		embed.addField(
			"Prefixes",
			prefixString,
			Help.useInline(command, "prefixes")
		);

		// Handles plugin IDs
		embed.addField(
			"Plugin ID",
			`\`${command.plugin.id}\``,
			Help.useInline(command, "plugin")
		);

		return embed;
	}
}
