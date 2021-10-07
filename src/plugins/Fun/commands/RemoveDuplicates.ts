import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordUtils,
	Logger,
	FriendlyError,
	DiscordMessage,
} from "@framedjs/core";
import { oneLine } from "common-tags";
import Emoji from "node-emoji";

export default class RemoveDuplicates extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "removedups",
			aliases: ["rmdup", "removedup", "removeduplicates"],
			about: oneLine`Removes duplicate votes from users that voted more than once.`,
			description: oneLine`Removes duplicate votes from users that voted more than once.
			Aliases are \`rmdup\`, \`removedup\`, and \`removeduplicates\`.`,
			usage: "<poll message url>",
			hideUsageInHelp: true,
			botPermissions: {
				checkAutomatically: true,
				discord: {
					permissions: [
						"SEND_MESSAGES",
						"ADD_REACTIONS",
						"READ_MESSAGE_HISTORY",
					],
				},
			},
			userPermissions: {
				checkAutomatically: true,
				discord: {
					permissions: ["MANAGE_MESSAGES"],
				},
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage) {
			if (!msg.discord.guild) {
				throw new FriendlyError("This command isn't supported in DMs!");
			} else if (msg.args) {
				if (!msg.args[0]) {
					await msg.sendHelpForCommand();
					return false;
				}

				const linkMsg = await DiscordUtils.getMessageFromLink(
					msg.args[0],
					msg.discord.client,
					msg.discord.guild
				);

				if (!linkMsg) {
					throw new FriendlyError(
						"The message linked couldn't be found!"
					);
				}

				const progressMessage = await msg.discord.channel
					.send(oneLine`${msg.discord.author} Removing users who voted twice!
						This might take a while...`);

				// Gets cached users from reactions
				const fetches = [];
				for (const extraReaction of linkMsg.reactions.cache) {
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
					Logger.error((error as Error).stack);
				}

				// string is user ID, data contains reaction
				const userMap = new Map<string, Discord.MessageReaction[]>();

				// Puts users in a map, with their message reactions
				for await (const [reactionEmote, messageReaction] of linkMsg
					.reactions.cache) {
					Logger.debug(`emote: ${reactionEmote}`);
					Logger.debug(
						`list: ${messageReaction.users.cache.toJSON()}`
					);

					for (const [userId] of messageReaction.users.cache) {
						const oldReactionData = userMap.get(userId) ?? [];
						oldReactionData.push(messageReaction);
						userMap.set(userId, oldReactionData);
					}
				}

				// Goes through the user map
				for await (const [user, reactionDataArray] of userMap) {
					// If there's more than 1 entry for reaction data
					if (reactionDataArray.length > 1) {
						// Removes any emotes they've reacted with
						for await (const reactionData of reactionDataArray) {
							const name = reactionData.emoji.name ?? `(null emoji)`;
							Logger.debug(oneLine`
							Removing ${name}
							(${Emoji.unemojify(name)})
							from ${reactionData.message.id} by ${user}`);
							await reactionData.users.remove(user);
						}
					}
				}

				await progressMessage.edit(
					`${msg.discord.author} ✅ Finished removed user votes that happend twice!`
				);
				return true;
			}
		}
		return false;
	}
}
