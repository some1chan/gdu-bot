import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordCommandInteraction,
	DiscordJsBuilders,
	DiscordMessage,
	Logger,
	Utils,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import ModerationPlugin from "../Moderation.plugin";

export default class extends BaseCommand {
	plugin!: ModerationPlugin;

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "clear",
			about: "Bulk delete messages.",
			usage: "<# of message to clear>",
			botPermissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES", "VIEW_CHANNEL"],
				},
			},
			userPermissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES"],
				},
			},
			// discordInteraction: {
			// 	slashCommandBuilder:
			// 		new DiscordJsBuilders.SlashCommandBuilder().addNumberOption(
			// 			option =>
			// 				option
			// 					.setName("number")
			// 					.setDescription(
			// 						"The number of messages to clear."
			// 					)
			// 					.setRequired(true)
			// 		),
			// 	global: false,
			// },
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		let num: number | undefined;

		if (msg.args && msg.args[0]) {
			num = Number(msg.args[0]);
		} else if (msg instanceof DiscordCommandInteraction) {
			const interaction = msg.discordInteraction.interaction;
			num = interaction.options.getNumber("number", true);
		}

		if (num == undefined) {
			if (msg instanceof DiscordMessage) {
				await msg.sendHelpForCommand();
			}
			return false;
		}

		if (isNaN(num)) {
			await msg.send("Please send a valid number!");
			return false;
		}

		if (num < 0) {
			await msg.send("Please enter a positive number!");
			return false;
		}

		if (num == 0) {
			await msg.send("Please enter a non-zero number!");
			return false;
		}

		const limit = 100;
		if (num > limit) {
			await msg.send(`The number cannot be greater than ${limit}!`);
		}

		let channel: Discord.BaseGuildTextChannel;
		if (
			msg instanceof DiscordMessage ||
			msg instanceof DiscordCommandInteraction
		) {
			const tempChannel = msg.discord.channel;
			if (tempChannel instanceof Discord.BaseGuildTextChannel) {
				channel = tempChannel;
			} else {
				await msg.send(
					"This channel is unsupported to bulk delete messages!"
				);
				return false;
			}
		} else {
			await msg.send(`This is an unsupported platform.`);
			return false;
		}

		// If the number is the limit, delete the original message,
		// so the bulk delete doesn't overload in the else statement.
		let messageDeleteOffset = 0;
		if (msg instanceof DiscordMessage) {
			if (num == limit) {
				await msg.discord.msg?.delete();
			} else {
				num++;
				messageDeleteOffset++;
			}
		}

		// Last permission check
		const auditChannel = await this.plugin.getModLogChannel(channel.guild);
		if (auditChannel && auditChannel.id == msg.discord.channel.id) {
			// Manually checks user permission for bot owners
			const permsResult = this.checkUserPermissions(msg, {
				botOwnersOnly: true,
			});
			if (!permsResult.success) {
				await msg.discord.msg?.reply(oneLine`${msg.discord.author},
				you're not allowed to use the \`clear\` command in ${auditChannel}!`);
				return false;
			}
		}

		// Bulk deletes messages
		const messages = await channel.bulkDelete(num, true);
		const replyText = `Bulk deleted ${
			messages.size - messageDeleteOffset
		} messages.`;

		const newMsg = await msg.send({ content: replyText, ephemeral: true });
		if (newMsg instanceof Discord.Message) {
			DiscordMessage.startCountdownBeforeDeletion(newMsg);
		}
		return true;
	}
}
