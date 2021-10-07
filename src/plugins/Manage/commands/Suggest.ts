import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	EmbedHelper,
	Logger,
	Utils,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";

const msgUrlKey = "msgUrl";
const suggestionChannelId =
	process.env.SUGGEST_CHANNEL_ID ?? "788616167224377344";
const modRoleId = process.env.MOD_ROLE_ID ?? "462342299171684364";
const communityRoleId = process.env.COMMUNITY_ROLE_ID ?? "758771336289583125";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "suggest",
			aliases: ["suggestion"],
			about: `Suggest something, such as event ideas or features.`,
			description: oneLine`Suggest something for the server, such as event ideas or bot features.
			If you have any concerns that you'd like to be private, please DM one of the <@&${modRoleId}>.`,
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
		if (msg.discord.msg?.editedAt) {
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

								const thisUrlArgs =
									msg.discord.msg.url.split("/");
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
					suggestionChannelId
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

					let discordMessage: Discord.Message;
					if (msgWithEmbed) {
						discordMessage = await msgWithEmbed.edit({
							embeds: [suggestionEmbed],
						});
					} else {
						discordMessage = await suggestionChannel.send({
							embeds: [suggestionEmbed],
						});
					}

					const thanks = stripIndents`
					${msg.discord.author}, we appreciate your suggestion.
					This will be reviewed by the <@&${modRoleId}> and <@&${communityRoleId}> team soon!
					`;

					const thanksEmbed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, this.id)
					)
						.setTitle("Thank You for Your Suggestion!")
						.setDescription(thanks)
						.setFooter("");

					const thankMsg = await msg.discord.channel.send({
						embeds: [thanksEmbed],
					});

					try {
						await Promise.all([
							msg.discord.msg?.react("👍"),
							discordMessage.fetch(),
						]);

						const listOfReactions = ["👍", "👎", "🤷"];
						const queue: Promise<Discord.MessageReaction>[] = [];
						for (const emoji of listOfReactions) {
							if (!discordMessage.reactions.cache.has(emoji)) {
								queue.push(discordMessage.react(emoji));
							}
						}

						await Promise.all(queue);
					} catch (error) {
						Logger.error(error);
					}

					try {
						await Utils.sleep(5000);
						await thankMsg.delete();
					} catch (error) {
						Logger.error((error as Error).stack);
					}
				} else {
					Logger.error(
						`Couldn't find channel with ID "${suggestionChannelId}"`
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
