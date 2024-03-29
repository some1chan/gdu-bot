import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	EmbedHelper,
	Logger,
} from "@framedjs/core";
import Raw from "../../Markdown/commands/Raw";
import * as ShortenURL from "../utils/ShortenURL";

export default class Link extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "link",
			aliases: ["discohook", "discohookembed", "embed", "lnk", "restore"],
			about: "Recreates a Discord message into Discohook.",
			usage: "[id|link|content]",
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

		if (msg.discord) {
			const parse = await Raw.getNewMessage(msg);
			const longLink = await Link.getLink(
				msg,
				parse?.newContent,
				parse?.newMsg
			);

			if (longLink) {
				let shortUrl: string | undefined;

				Logger.debug(`Shortening long URL "${longLink}"`);
				await ShortenURL.shorten(longLink, (url, error) => {
					if (error) {
						Logger.error(error);
					} else {
						shortUrl = url;
					}
				});

				if (shortUrl) {
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						await EmbedHelper.getCheckOutFooter(msg, this.id)
					)
						.setTitle("Message Link")
						.setDescription(`[${shortUrl}](${shortUrl})`);

					await msg.discord.channel.send({ embeds: [embed] });
					return true;
				}
			}
		} else {
		}
		return false;
	}

	static async getLink(
		msg: BaseMessage,
		newContent?: string,
		newMsg?: Discord.Message
	): Promise<string | undefined> {
		if (msg.discord && msg.discord.msg) {
			const firstPassMessage: {
				messages: [
					{
						data: {
							content?: string | null;
							embeds?: Discord.MessageEmbed[] | null;
							username?: string | null;
							avatar_url?: string | null;
						};
					}
				];
			} = {
				messages: [
					{
						data: {},
					},
				],
			};

			const data = firstPassMessage.messages[0].data;

			if (newContent) {
				data.content = newContent;
			}

			if (newMsg) {
				if (newMsg.embeds.length > 0) {
					data.embeds = newMsg.embeds;
				}
			}

			let nickname: string | undefined | null;
			if (msg.discord.client.user) {
				nickname = msg.discord.guild?.members.cache.get(
					msg.discord.client.user?.id
				)?.nickname;
			}
			data.username = nickname
				? nickname
				: msg.discord.client.user?.username;
			data.avatar_url = msg.discord.client.user?.avatarURL();

			// Makes TypeScript get less complaints with changing parameters
			const secondPassJson = JSON.parse(
				JSON.stringify(firstPassMessage, Link.removeNulls, 0)
			);

			if (secondPassJson.messages[0].data.embeds) {
				secondPassJson.messages[0].data.embeds.forEach(
					(embed: { type: null; fields: never[] }) => {
						// Removes type: "rich"
						embed.type = null;
						if (embed.fields) {
							// Removes inline variables, through removeNulls
							embed.fields.forEach(
								(field: { inline: boolean | null }) => {
									if (field.inline == false) {
										field.inline = null;
									}
								}
							);
						}
					}
				);
			}

			const thirdPassJson = JSON.parse(
				JSON.stringify(secondPassJson, Link.removeNulls, 0)
			);

			// Make content null
			if (!thirdPassJson.messages[0].data.content) {
				thirdPassJson.messages[0].data.content = null;
			}

			const fourthPassJson = {
				messages: [
					{
						data: {
							content: thirdPassJson.messages[0].data.content,
							embeds: thirdPassJson.messages[0].data.embeds,
							username: thirdPassJson.messages[0].data.username,
							avatar_url:
								thirdPassJson.messages[0].data.avatar_url,
						},
					},
				],
			};

			const finalPassJson = JSON.stringify(fourthPassJson, undefined, 0);

			// For some reason, discohook doesn't like "+" and prefers "-".
			// This isn't considered "web safe" but it's fine here?
			const buffer = Buffer.from(finalPassJson, "utf-8");
			const base64 = buffer
				.toString("base64")
				.replace(/\+/g, "-")
				.replace(/=/g, "");
			return `https://discohook.org/?data=${base64}`;
		}

		return undefined;
	}

	/**
	 * JSON.stringify replacer that removes any entires that are null.
	 *
	 * @param key
	 * @param value
	 *
	 * @returns value, if not null
	 */
	static removeNulls(_key: string, value: unknown): unknown {
		if (value === null) {
			return undefined;
		}
		return value;
	}
}
