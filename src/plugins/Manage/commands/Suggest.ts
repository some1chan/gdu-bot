import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	EmbedHelper,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";

const msgUrlKey = "msgUrl";

export default class extends BaseCommand {
	suggestionChannelId = process.env.SUGGEST_CHANNEL_ID
		? process.env.SUGGEST_CHANNEL_ID
		: "788616167224377344";

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "suggest",
			aliases: ["suggestion"],
			about: `Suggest something, such as event ideas or features.`,
			description: oneLine`Suggest something for the server, such as event ideas or bot features.
			If you have any concerns that you'd like to be private, please DM one of the <@&462342299171684364>.`,
			usage: "<suggestion>",
			examples: oneLine`
			\`{{prefix}}{{id}} Give the {{prefix}}{{id}} example
			a better suggestion than this one.\``,
		});
	}

	async findOldSuggestion(
		msg: DiscordMessage,
		suggestionChannel: Discord.TextChannel
	): Promise<Discord.Message | undefined> {
		let msgWithEmbed: Discord.Message | undefined;
		if (msg.discord.msg?.edits) {
			const collection = await suggestionChannel.messages.fetch({
				around: msg.discord.msg.id,
			});

			const regex = /\[\]\(([^)]*)\)/g;
			for (const [, suggestionMsg] of collection) {
				const infoField = suggestionMsg.embeds[0]?.fields.find(
					a => a.name == "Info"
				);
				if (infoField) {
					// Attempts to find data in the info embed field
					const matches = infoField.value.matchAll(regex);

					for (const match of matches) {
						const args = match[1]?.split(", ");
						if (args && args[0] && args[1]) {
							const msgUrl = args[0];
							const key = args[1].replace(/"/g, "");

							// If the key matches
							if (key == msgUrlKey) {
								// Check if the message ID in the URL matches this one
								const msgUrlArgs = msgUrl.split("/");
								const msgUrlValueId =
									msgUrlArgs[msgUrlArgs.length - 1];

								const thisUrlArgs = msg.discord.msg.url.split(
									"/"
								);
								const thisUrlValueId =
									thisUrlArgs[thisUrlArgs.length - 1];

								if (msgUrlValueId == thisUrlValueId) {
									msgWithEmbed = suggestionMsg;
								}
							}
						}
					}
				}
			}
		}

		return msgWithEmbed;
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.args && msg.args.length > 0) {
			// Things
			const argsContent = msg.getArgsContent();

			if (msg instanceof DiscordMessage && msg.discord.msg) {
				if (!msg.discord.guild) {
					return false;
				}

				const suggestionChannel = msg.discord.client.channels.cache.get(
					this.suggestionChannelId
				) as Discord.TextChannel;

				let msgWithEmbed = await this.findOldSuggestion(
					msg,
					suggestionChannel
				);

				if (suggestionChannel) {
					const data = `[](${msg.discord.msg.url}, "${msgUrlKey}")`;
					const suggestionEmbed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, this.id)
					);
					suggestionEmbed
						.setAuthor(
							msg.discord.author.tag,
							msg.discord.author.displayAvatarURL({})
						)
						.addField(
							"Info",
							`${msg.discord.author} - [Click here](${msg.discord.msg.url}) to see the original message.${data}`
						)
						.addField("Suggestion", argsContent)
						.setFooter(
							`User ID: ${msg.discord.author.id}`,
							suggestionEmbed.footer?.iconURL
						);

					if (msgWithEmbed) {
						await msgWithEmbed.edit(suggestionEmbed);
					} else {
						await suggestionChannel.send(suggestionEmbed);
					}

					const thanks = stripIndents`
					${msg.discord.author}, we appreciate your suggestion.
					This will be reviewed by the <@&462342299171684364> and <@&758771336289583125> team soon!
					`;

					const thanksEmbed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, this.id)
					)
						.setTitle("Thank You for Your Suggestion!")
						.setDescription(thanks)
						.setFooter("");

					const thankMsg = await msg.discord.channel.send(
						thanksEmbed
					);

					try {
						await msg.discord.msg?.react("👍");
					} catch (error) {
						Logger.error(error);
					}

					try {
						await thankMsg.delete({
							timeout: 5 * 1000,
							reason: "Suggest command",
						});
					} catch (error) {
						Logger.error(error.stack);
					}
				} else {
					Logger.error(
						`Couldn't find channel with ID "${this.suggestionChannelId}"`
					);
					return false;
				}

				return true;
			}
		}

		await msg.sendHelpForCommand();
		return false;
	}
}
