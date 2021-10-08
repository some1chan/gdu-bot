import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	Logger,
} from "@framedjs/core";
import { stripIndents } from "common-tags";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";
import fs from "fs";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "setupslashcommands",
			about: "A possible disaster.",
			usage: "<required param> [optional param]",
			userPermissions: {
				botOwnersOnly: true,
				checkAutomatically: false,
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		// Manually checks user permission to stay silent
		const permsResult = this.checkUserPermissions(
			msg,
			this.userPermissions
		);
		if (!permsResult.success) {
			Logger.warn(
				`${this.id} called by user without permission (${msg.discord?.author.id})`
			);
			return false;
		}

		if (msg instanceof DiscordMessage && msg.discord.msg != null) {
			if (!msg.discord.guild) {
				msg.send("this command cannot be ran in DMs");
				return false;
			}

			const guildId = msg.discord.guild.id;
			const token = msg.discord.client.token ?? "";
			const clientId = msg.discord.client.user?.id ?? "";

			await msg.discord.channel.send(
				`Are you sure? Type "yes" if so. Cancel by either waiting 10s or saying anything else.`
			);

			const filter = (message: Discord.Message) => {
				return message.author.id === msg.discord.author.id;
			};
			await msg.discord.channel
				.awaitMessages({
					filter,
					max: 1,
					time: 10 * 1000,
					errors: ["time"],
				})
				.then(async collected => {
					if (collected.first()?.content == "yes") {
						await msg.send(
							"Started refreshing application slash commands."
						);

						// const rest = new REST({ version: "9" }).setToken(token);

						// new SlashCommandBuilder();

						// await rest.put(
						// 	Routes.applicationGuildCommands(clientId, guildId),
						// 	{ body: {} }
						// );
					} else {
						await msg.send("Cancelled");
					}
				})
				.catch(async collected => {
					await msg.send("Timed out");
				});

			return true;
		}

		return false;
	}
}
