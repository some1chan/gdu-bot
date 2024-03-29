/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordUtils,
	EmbedHelper,
	FriendlyError,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndent, stripIndents } from "common-tags";
import Hastebin from "hastebin";

export default class Raw extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "raw",
			about: "Escapes all markdown in a message.",
			description: oneLine`
			Escapes all markdown in a message, including code blocks,
			bold, italics, underlines, and strikethroughs.
			This allows the message to be copy and pastable.`,
			usage: "[id|link|content]",
			examples: stripIndent`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} This ~~is~~ a **test**!\``,
			userPermissions: {
				botOwnersOnly: true,
				checkAutomatically: false,
			},
			inline: true,
			// hideUsageInHelp: true,
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

		if (msg.discord?.guild && msg.args) {
			const parse = await Raw.getNewMessage(msg, true);
			return await Raw.showStrippedMessage(
				msg,
				this.id,
				parse?.newContent
			);
		}

		return false;
	}

	/**
	 *
	 * @param msg
	 * @param silent
	 */
	static async getNewMessage(
		msg: BaseMessage,
		silent?: boolean
	): Promise<
		| {
				newMsg?: Discord.Message;
				newContent: string;
		  }
		| undefined
	> {
		if (msg.discord?.guild && msg.args) {
			// Grabs the argument of the thing
			let content = msg.getArgsContent();

			content = content.trimLeft();

			// Snowflake logic
			let snowflakeMsg: Discord.Message | undefined;
			const snowflake = Discord.SnowflakeUtil.deconstruct(content.trim());
			const validSnowflake =
				snowflake.binary !=
					"0000000000000000000000000000000000000000000000000000000000000000" &&
				/^\d+$/.test(content);
			if (validSnowflake) {
				snowflakeMsg = await Raw.getMessageFromSnowflake(
					content,
					Array.from(msg.discord.client.channels.cache.values()),
					msg.discord.channel
				);
			}

			// Link logic
			let linkMsg: Discord.Message | undefined;
			let linkError: FriendlyError | undefined;
			if (!snowflakeMsg) {
				try {
					linkMsg = await DiscordUtils.getMessageFromLink(
						content,
						msg.discord.client,
						msg.discord.guild
					);
				} catch (error) {
					if (linkError instanceof FriendlyError) {
						linkError = error as FriendlyError;
					} else {
						throw error;
					}
				}
			}

			// Previous message logic
			let previousMsg: Discord.Message | undefined;
			if (!linkMsg && !snowflakeMsg) {
				try {
					const messages = await msg.discord.channel.messages.fetch({
						limit: 10,
					});
					messages.forEach(message => {
						if (message.content != msg.content && !previousMsg) {
							previousMsg = message;
						}
					});
				} catch (error) {
					Logger.error(
						`Unable to fetch messages in channel\n${(error as Error).stack}`
					);
				}
			}

			// Sends the output
			let newMsg: Discord.Message | undefined;
			let newContent: string;

			if (validSnowflake) {
				if (snowflakeMsg) {
					newContent = snowflakeMsg.content;
					newMsg = snowflakeMsg;
				} else {
					if (!silent) {
						await msg.discord.channel.send(oneLine`
					${msg.discord.author}, I think you inputted a message ID, but I couldn't retrieve it.
					Try running \`${msg.prefix}${msg.command}\` again in the channel the message exists in,
					or copy the message link and use that instead.`);
					}
					return undefined;
				}
			} else if (linkMsg) {
				if (linkMsg instanceof Discord.Message) {
					newContent = linkMsg.content;
					newMsg = linkMsg;
				} else {
					throw new Error(
						`linkMsg is not an instance of Discord.Message`
					);
				}
			} else if (content.length > 0) {
				newContent = content;
			} else if (previousMsg) {
				newContent = previousMsg.content;
				newMsg = previousMsg;
			} else {
				if (!silent)
					await msg.discord.channel.send(oneLine`
					${msg.discord.author}, I'm unable to give you an escaped version of anything!`);
				return undefined;
			}

			// Returns the output
			if ((newContent && newContent.length > 0) || newMsg) {
				return {
					newMsg,
					newContent,
				};
			}
		}

		return undefined;
	}

	/**
	 * Shows the message that has markdown stripped.
	 *
	 * @param msg Base Message
	 * @param id Command used, for EmbedHelper.getTemplate()
	 * @param newContent Parse new content
	 * @param mode Options to upload on
	 */
	static async showStrippedMessage(
		msg: BaseMessage,
		id: string,
		newContent: string | undefined,
		mode: "file" | "hastebin" | "none" = "none"
	): Promise<boolean> {
		if (msg.discord) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, id)
			).setTitle("Raw Formatting");

			// Handles contents
			if (newContent && newContent?.length > 0) {
				const newContentNoCodeblock = Discord.Util.escapeMarkdown(
					newContent,
					{
						codeBlock: false,
					}
				);
				const newCleanContent = Discord.Util.escapeMarkdown(newContent);
				const rawCommand =
					"$(command default.bot.utils.command.rawfile)";
				const rawHastebin =
					"$(command default.bot.utils.command.rawhastebin)";
				let attachment: Discord.MessageAttachment;
				let link = "";

				switch (mode) {
					case "none":
						if (newCleanContent != newContentNoCodeblock) {
							switch (mode) {
								case "none":
									embed.setDescription(
										await BaseMessage.format(
											oneLine`The message contains a codeblock, so it has been sent as a separate message.
											Please note that it may not be completely accurate. If full accuracy is wanted, please
											use \`${rawCommand}\` or \`${rawHastebin}\` instead.`,
											msg.client,
											await msg.getPlace()
										)
									);
									await msg.discord.channel.send({
										embeds: [embed],
									});
									await msg.discord.channel.send(
										newCleanContent
									);
									break;
								default:
									throw new Error();
							}
						} else {
							const codeblock = "```";
							embed.setDescription(stripIndents`
							${codeblock}
							${newContent}
							${codeblock}`);
							await msg.discord.channel.send({ embeds: [embed] });
						}
						break;
					case "file":
						attachment = new Discord.MessageAttachment(
							Buffer.from(newContent),
							`raw.txt`
						);
						embed.setDescription(
							oneLine`The raw message has been sent as a .txt file.`
						);
						await msg.discord.channel.send({
							embeds: [embed],
							files: [attachment],
						});
						break;
					case "hastebin":
						try {
							link = await Hastebin.createPaste(
								newContent,
								{
									raw: true,
									contentType: true,
								},
								{ contentType: "text/plain" }
							);
						} catch (error) {
							Logger.error((error as Error).stack);
							await msg.discord.channel.send(
								`${msg.discord.author}, something went wrong when creating the paste!`
							);
							return false;
						}

						embed
							.setDescription(
								oneLine`
								The raw message has been sent to Hastebin.`
							)
							.addField(
								"🔗 Links",
								stripIndents`
								Hastebin link: ${link.replace("/raw/", "/")}
								Raw link: ${link}`
							);
						await msg.discord.channel.send({ embeds: [embed] });
						break;
					default:
						throw new TypeError(
							`useOnCodeblock should equal "file", "hastebin", or "none", not "${mode}"`
						);
				}
			} else {
				await msg.discord.channel.send(
					`${msg.discord.author}, the message is empty!`
				);
				return false;
			}

			return true;
		}

		return false;
	}

	/**
	 * Attempts to get a message from a snowflake
	 *
	 * @param snowflake Snowflake as a string
	 * @param channels List of Discord channels to scan
	 * @param commandChannel The channel that this command was ran in
	 *
	 * @returns Discord Message or undefined
	 */
	static async getMessageFromSnowflake(
		snowflake: string,
		channels: Discord.AnyChannel[],
		commandChannel: Discord.TextBasedChannel
	): Promise<Discord.Message | undefined> {
		let newMsg: Discord.Message | undefined;
		if (snowflake) {
			for await (const element of channels) {
				// If the message has been found, stop
				if (newMsg) continue;

				// If the channel is a DM, and the message being found
				// isn't the same place, the message shouldn't be leaked
				const channel = element as Discord.TextBasedChannel;
				if (
					commandChannel.type == "DM" &&
					commandChannel.id != channel.id
				) {
					continue;
				}

				// Attempts to find a new message by ID
				if (!newMsg) {
					newMsg = channel.messages?.cache.get(snowflake);
				}
			}

			if (!newMsg) {
				try {
					newMsg = await commandChannel.messages.fetch(snowflake);
				} catch (error) {
					Logger.warn(
						`Unable to find message with id "${snowflake}"`
					);
				}
			}
		}
		return newMsg;
	}

	/**
	 * Gets a Discord message object from a link
	 *
	 * @param link Message link
	 * @param client Discord client
	 * @param guild Discord guild
	 *
	 * @returns Discord message or an error message string
	 */
	static async getMessageFromLink(
		link: string,
		client: Discord.Client,
		author: Discord.User,
		guild: Discord.Guild
	): Promise<Discord.Message | string | undefined> {
		// If it's not an actual link, return undefined
		if (!link.includes(".com")) {
			return undefined;
		}

		const args = link
			.replace("https://", "")
			.replace("http://", "")
			.replace("discordapp.com/", "")
			.replace("discord.com/", "")
			.replace("channels/", "")
			.split("/");

		if (args.length != 3) {
			return "the message link isn't valid!";
		}

		if (guild.id != args[0]) {
			return "the message link cannot be from another server!";
		}

		const channel = client.channels.cache.get(args[1]) as
			| Discord.TextChannel
			| Discord.NewsChannel
			| Discord.DMChannel;
		if (!channel) {
			return `I couldn't find the channel from the message link!`;
		} else if (channel.type == "DM" && author.id != channel.id) {
			return `I won't retrieve private DMs into a public server.`;
		}

		let message = channel.messages.cache.get(args[2]);
		if (!message) {
			try {
				message = await channel.messages.fetch(args[2]);
			} catch (error) {
				return "I couldn't fetch the channel ID!";
			}
		}

		return message;
	}
}
