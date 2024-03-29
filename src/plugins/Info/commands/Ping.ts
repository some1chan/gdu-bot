import {
	BaseMessage,
	BasePlugin,
	BaseCommand,
	EmbedHelper,
} from "@framedjs/core";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "ping",
			about: "Sends a pong back, and latency info.",
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.discord) {
			const discordMsg = msg.discord.msg
				? msg.discord.msg
				: msg.discord.id
				? msg.discord.channel.messages.cache.get(msg.discord.id)
				: undefined;

			if (!discordMsg) {
				msg.discord?.channel.send(
					oneLine`${msg.discord.author}, calling this comamnd without someone 
					sending the command is not supported!`
				);
				return false;
			}

			const userDateNumber =
				discordMsg.editedTimestamp == 0 ||
				discordMsg.editedTimestamp == null
					? discordMsg.createdTimestamp
					: discordMsg.editedTimestamp;

			const newDiscordMsg = await discordMsg.channel.send(`Pong!`);

			const botDateNumber =
				newDiscordMsg.editedTimestamp == 0 ||
				newDiscordMsg.editedTimestamp == null
					? newDiscordMsg.createdTimestamp
					: newDiscordMsg.editedTimestamp;

			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setColor(EmbedHelper.getColorWithFallback(msg.discord.guild))
				.setTitle("Latency Info").setDescription(stripIndent`
				🏓 \`Message Latency\` - ${botDateNumber - userDateNumber}ms
				🤖 \`API Latency\` - ${Math.round(discordMsg.client.ws.ping)}ms`);
			await newDiscordMsg.edit({
				content: newDiscordMsg.content,
				embeds: [embed],
			});

			return true;
		} else {
			msg.send("Pong!");
		}
		return false;
	}
}
