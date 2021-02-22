import { oneOptionMsg } from "../Fun.plugin";
import {
	BaseEvent,
	BaseMessage,
	BasePlugin,
	Discord,
	EmbedHelper,
	FriendlyError,
	Logger,
} from "@framedjs/core";
import Emoji from "node-emoji";
import { oneLine } from "common-tags";
import Poll from "../commands/Poll";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "pollMessageReactionAdd",
			discord: {
				name: "messageReactionAdd",
			},
		});
	}

	async run(
		reaction: Discord.MessageReaction,
		user: Discord.User | Discord.PartialUser
	): Promise<void> {
		Logger.silly(`Reaction Add From: ${user.id}`);

		if (user.bot) return;

		// https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
		// When we receive a reaction we check if the reaction is partial or not
		if (reaction.partial) {
			// If the message this reaction belongs to was removed the fetching
			// might result in an API error, which we need to handle
			try {
				Logger.debug("Fetching reaction...");
				await reaction.fetch();
			} catch (error) {
				Logger.error(
					"Something went wrong when fetching the message: ",
					error.stack
				);
				return;
			}
		}

		const embedDescription:
			| string
			| undefined = reaction.message.embeds[0]?.description?.toLocaleLowerCase();

		const isPollEmbed: boolean | undefined = embedDescription?.includes(
			"poll by <@"
		);
		// Message.discordGetPlace, except it doesn't create a new Place if not found
		// This is to workaround a bug in where the new Place is being created elsewhere
		// but events will also try to create a new place too,
		// thus creating duplicates and will error
		const platformId = reaction.message.guild?.id ?? "discord_default";
		const place = this.client.provider.place.get(platformId);
		if (!place) {
			return;
		}
		const commandRan = await this.client.formatting.format(
			`$(command poll)`,
			place
		);
		const newContent = `${reaction.message.content
			.replace(
				"poll:",
				await this.client.formatting.format(commandRan, place)
			)
			.trim()}`;

		const newMsg = new BaseMessage({
			client: this.client,
			content: newContent,
			discord: {
				client: reaction.message.client,
				id: reaction.message.id,
				channel: reaction.message.channel,
				author: reaction.message.author,
				guild: reaction.message.guild,
			},
		});
		await newMsg.getMessageElements();
		const parsedResults = await Poll.customParse(newMsg, true);

		const singleVoteOnly: boolean | undefined =
			embedDescription?.endsWith(oneOptionMsg.toLocaleLowerCase()) ||
			parsedResults?.onceMultipleOption == "once";

		const isPollCommand =
			reaction.message.content.startsWith(commandRan) ||
			reaction.message.content.startsWith("poll:") ||
			isPollEmbed;

		if (isPollCommand && singleVoteOnly) {
			// Gets cached users from reactions
			const fetches = [];
			for (const extraReaction of reaction.message.reactions.cache) {
				const reaction = extraReaction[1];
				if (reaction.users.cache.size != reaction.count) {
					Logger.silly("User count discrepancy found:");
					Logger.silly(
						`  reaction.users.cache.size: ${reaction.users.cache.size}`
					);
					Logger.silly(`  reaction.count: ${reaction.count}`);
					fetches.push(reaction.users.fetch({}));
				}
			}
			try {
				await Promise.all(fetches);
			} catch (error) {
				Logger.error(error.stack);
			}

			// https://discordjs.guide/popular-topics/reactions.html#removing-reactions-by-user
			const extraUserReactions = reaction.message.reactions.cache.filter(
				extraReaction => {
					const userHasReaction = extraReaction.users.cache.has(
						user.id
					);
					const isSimplePollReaction = isPollEmbed != true;
					// Generous/lazy check that tries to get all valid options from the embed
					const isOptionPollReaction =
						embedDescription?.includes(extraReaction.emoji.name) ==
							true && isPollEmbed == true;
					const extraReactionJustPlaced =
						extraReaction.emoji.name == reaction.emoji.name;

					return (
						userHasReaction &&
						(isSimplePollReaction || isOptionPollReaction) &&
						!extraReactionJustPlaced
					);
				}
			);

			try {
				Logger.silly(oneLine`
					Current reaction: ${reaction.emoji.name} 
					(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);

				const botMember = reaction.message.guild
					? reaction.message.guild?.me
					: null;

				if (!(reaction.message.channel instanceof Discord.DMChannel)) {
					for await (const reaction of extraUserReactions.values()) {
						if (
							!(
								botMember &&
								botMember.hasPermission(["MANAGE_MESSAGES"])
							)
						) {
							throw new FriendlyError(
								"The bot doesn't have the `MANAGE_MESSAGES` permission on this server!",
								"Bot Missing Permissions"
							);
						}
						Logger.silly(oneLine`
							Removing ${reaction.emoji.name} 
							(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);
						await reaction.users.remove(user.id);
					}
				}
			} catch (error) {
				if (error instanceof FriendlyError) {
					const embed = EmbedHelper.getTemplate(reaction.message)
						.setTitle(error.friendlyName)
						.setDescription(error.message);
					await reaction.message.channel.send(embed);
				} else {
					Logger.error(error.stack);
				}
			}
		}
	}
}
