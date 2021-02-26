import { BaseEvent, BasePlugin, Discord, Logger } from "@framedjs/core";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "gduRRMessageReactionAdd",
			discord: {
				name: "messageReactionAdd",
			},
		});
	}

	async run(
		reaction: Discord.MessageReaction,
		user: Discord.User | Discord.PartialUser
	): Promise<void> {
		try {
			await user.fetch();
		} catch (error) {
			Logger.error(error);
			return;
		}

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

		if (!reaction.message.guild) {
			return;
		}

		if (
			!(
				process.env.YOUTUBE_EMOJI &&
				process.env.TWITCH_EMOJI &&
				process.env.EVENT_EMOJI &&
				process.env.GAME_EMOJI &&
				process.env.STREAK_EMOJI
			)
		) {
			return;
		}

		if (
			!(
				process.env.YOUTUBE_ROLE_ID &&
				process.env.TWITCH_ROLE_ID &&
				process.env.EVENT_ROLE_ID &&
				process.env.GAME_ROLE_ID &&
				process.env.STREAK_ROLE_ID
			)
		) {
			return;
		}

		const youtubeEmoji = reaction.client.emojis.cache.get(
			process.env.YOUTUBE_EMOJI
		);
		const twitchEmoji = reaction.client.emojis.cache.get(
			process.env.TWITCH_EMOJI
		);
		const eventEmoji = process.env.EVENT_EMOJI;
		const gameEmoji = process.env.GAME_EMOJI;
		const streakEmoji = process.env.STREAK_EMOJI;

		if (
			!(
				youtubeEmoji &&
				twitchEmoji &&
				eventEmoji &&
				gameEmoji &&
				streakEmoji
			)
		) {
			Logger.error("Missing emoji");
			return;
		}

		const youtubeRole = reaction.message.guild.roles.cache.get(
			process.env.YOUTUBE_ROLE_ID
		);
		const twitchRole = reaction.message.guild.roles.cache.get(
			process.env.TWITCH_ROLE_ID
		);
		const eventRole = reaction.message.guild.roles.cache.get(
			process.env.EVENT_ROLE_ID
		);
		const gameRole = reaction.message.guild.roles.cache.get(
			process.env.GAME_ROLE_ID
		);
		const streakRole = reaction.message.guild.roles.cache.get(
			process.env.STREAK_ROLE_ID
		);

		if (
			!(youtubeRole && twitchRole && eventRole && gameRole && streakRole)
		) {
			Logger.error("Missing role");
			return;
		}

		let newMsg: Discord.Message;

		if (
			reaction.message.url ==
			this.client.provider.plugins.get(this.plugin.id, "url")
		) {
			let member = reaction.message.guild.member(user.id);
			if (!member) {
				Logger.error("Member not found");
				return;
			}

			// Gets the member's roles
			try {
				member.fetch();
			} catch (error) {
				Logger.error(error);
			}

			let addRole = false;
			let changedRole: Discord.Role | undefined;

			switch (reaction.emoji.id) {
				case process.env.YOUTUBE_EMOJI:
					changedRole = youtubeRole;
					break;
				case process.env.TWITCH_EMOJI:
					changedRole = twitchRole;
					break;
			}

			switch (reaction.emoji.name) {
				case process.env.EVENT_EMOJI:
					changedRole = eventRole;
					break;
				case process.env.GAME_EMOJI:
					changedRole = gameRole;
					break;
				case process.env.STREAK_EMOJI:
					changedRole = streakRole;
					break;
			}

			if (!changedRole) {
				Logger.error("changedRole is undefined");
				return;
			}

			if (!member.roles.cache.has(changedRole.id)) {
				await member.roles.add(changedRole);
				addRole = true;
			} else {
				await member.roles.remove(changedRole);
			}

			await reaction.users.remove(user.id);

			if (addRole) {
				newMsg = await reaction.message.channel.send(
					`${user}, I've given you the ${changedRole?.name} role.`
				);
			} else {
				newMsg = await reaction.message.channel.send(
					`${user}, I've removed the ${changedRole?.name} role from you.`
				);
			}

			await newMsg.delete({
				timeout: 5 * 1000,
				reason: "Role assignment",
			});
		}
	}
}
