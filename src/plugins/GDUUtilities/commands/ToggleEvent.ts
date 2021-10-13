import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	Logger,
} from "@framedjs/core";
import { oneLine, stripIndents } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "toggleevent",
			aliases: ["toggleevents", "togglevent"],
			about: "Sets up the server for a community event.",
			description: stripIndents`${oneLine`Sets up the server for a community event.
			This command will move the Events channel up. Optionally, it can also show the
			"We're Recording" channel.`}`,
			examples: stripIndents`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} record\``,
			userPermissions: {
				discord: {
					// Mods, Community Manager
					roles: [
						process.env.MOD_ROLE_ID ?? "462342299171684364",
						process.env.COMMUNITY_ROLE_ID ?? "758771336289583125",
					],
				},
			},
		});
	}

	sortChannelCategories(
		guild: Discord.Guild
	): (Discord.GuildChannel | Discord.ThreadChannel)[] {
		let i = Array.from(guild.channels.cache.values()).filter(
			channel =>
				channel instanceof Discord.GuildChannel &&
				channel.type == "GUILD_CATEGORY"
		);

		i.sort((a, b) => {
			if (
				a instanceof Discord.GuildChannel &&
				b instanceof Discord.GuildChannel
			) {
				if (a.position < b.position) {
					return -1;
				} else if (a.position > b.position) {
					return 1;
				} else {
					return 0;
				}
			}
			return 0;
		});

		return i;
	}

	debugOutput(
		sortedArray: (Discord.GuildChannel | Discord.ThreadChannel)[]
	): void {
		let newStr = "";
		for (let i = 0; i < sortedArray.length; i++) {
			const channel = sortedArray[i];

			if (channel.type != "GUILD_CATEGORY") continue;

			// If the element exceeds the check, don't give it a new line
			const newLine = i + 1 < sortedArray.length ? "\n" : "";
			newStr += `${channel.name} | pos:${channel.position} - rawPos:${channel.rawPosition}${newLine}`;
		}
		Logger.debug(`\n${newStr}`);
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg.platform == "discord" && msg.discord) {
			//#region Environment variable checks
			if (!process.env.EVENT_CATEGORY_CHANNEL_ID) {
				throw new Error(
					`Environment variable EVENT_CATEGORY_CHANNEL_ID wasn't set`
				);
			} else if (!process.env.PRIVATE_CATEGORY_CHANNEL_ID) {
				throw new Error(
					`Environment variable PRIVATE_CATEGORY_CHANNEL_ID wasn't set`
				);
			} else if (!process.env.ARCHIVE_CATEGORY_CHANNEL_ID) {
				throw new Error(
					`Environment variable ARCHIVE_CATEGORY_CHANNEL_ID wasn't set`
				);
			} else if (!process.env.MAIN_GUILD_ID) {
				throw new Error(
					`Environment variable MAIN_GUILD_ID wasn't set`
				);
			}
			//#endregion

			//#region Gets mainGuild, privateCategoryChannel, eventCategoryChannel, and archiveCategoryChannel
			const mainGuild = msg.discord.client.guilds.cache.get(
				process.env.MAIN_GUILD_ID
			);
			if (!mainGuild) {
				throw new Error(
					`mainGuild is undefined (ID searched: ${process.env.MAIN_GUILD_ID})`
				);
			}

			const privateCategoryChannel = mainGuild.channels.cache.get(
				process.env.PRIVATE_CATEGORY_CHANNEL_ID
			);
			if (!privateCategoryChannel) {
				throw new Error(
					`privateCategoryChannel is undefined (ID searched: ${process.env.PRIVATE_CATEGORY_CHANNEL_ID})`
				);
			} else if (
				!(privateCategoryChannel instanceof Discord.CategoryChannel)
			) {
				throw new Error(
					`(privateCategoryChannel instanceof Discord.CategoryChannel is false`
				);
			}
			const eventCategoryChannel = mainGuild.channels.cache.get(
				process.env.EVENT_CATEGORY_CHANNEL_ID
			);
			if (!eventCategoryChannel) {
				throw new Error(
					`eventCategoryChannel is undefined (ID searched: ${process.env.EVENT_CATEGORY_CHANNEL_ID})`
				);
			} else if (
				!(eventCategoryChannel instanceof Discord.CategoryChannel)
			) {
				throw new Error(
					`(eventCategoryChannel instanceof Discord.CategoryChannel is false`
				);
			}
			const archiveCategoryChannel = mainGuild.channels.cache.get(
				process.env.ARCHIVE_CATEGORY_CHANNEL_ID
			);
			if (!archiveCategoryChannel) {
				throw new Error(
					`archiveCategoryChannel is undefined (ID searched: ${process.env.EVENT_CATEGORY_CHANNEL_ID})`
				);
			} else if (
				!(archiveCategoryChannel instanceof Discord.CategoryChannel)
			) {
				throw new Error(
					`(archiveCategoryChannel instanceof Discord.CategoryChannel is false`
				);
			}
			//#endregion

			// Gets the "We're Recording" channel, but won't error out if it doesn't exist
			let recordingChannel: Discord.GuildChannel | undefined;
			if (process.env.RECORDING_CHANNEL_ID && msg.args) {
				if (msg.args[0] == "record") {
					recordingChannel = mainGuild.channels.cache.get(
						process.env.RECORDING_CHANNEL_ID
					) as Discord.GuildChannel;
				}
			}

			const sorted = this.sortChannelCategories(mainGuild);
			const normalizeList: Discord.ChannelPosition[] = [];
			for (const channel of sorted) {
				if (channel.type != "GUILD_CATEGORY") continue;

				normalizeList.push({
					channel: channel.id,
					position: channel.position,
				});
			}
			await mainGuild.setChannelPositions([...normalizeList]);
			this.debugOutput(sorted);

			// Indicate if the event is happening, judging by if it's above a certain point
			const eventIsHappening = eventCategoryChannel.position < 5;

			// Moved recording message
			let extraMessage = "";
			if (recordingChannel) {
				if (eventIsHappening) {
					extraMessage = ` and **hid** **${recordingChannel}**`;
				} else {
					extraMessage = ` and **revealed** **${recordingChannel}**`;
				}
			}

			// If that category is raised up high, move it back down
			if (eventIsHappening) {
				await Promise.all([
					mainGuild.setChannelPositions([
						{
							channel: eventCategoryChannel.id,
							position: Math.max(
								archiveCategoryChannel.position - 1,
								0
							),
						},
					]),
					recordingChannel?.permissionOverwrites.edit(
						recordingChannel.guild.roles.everyone,
						{ VIEW_CHANNEL: !eventIsHappening }
					),
				]);
				await msg.send(
					`✅ I've moved the **${eventCategoryChannel}** channel **down**${extraMessage}.`
				);
			} else {
				const movementList: Discord.ChannelPosition[] = [];
				for (const channel of sorted) {
					if (
						channel.id != process.env.PRIVATE_CATEGORY_CHANNEL_ID &&
						channel.id != process.env.EVENT_CATEGORY_CHANNEL_ID
					) {
						if (channel.type != "GUILD_CATEGORY") continue;

						movementList.push({
							channel: channel.id,
							position: channel.position + 1,
						});
					}
				}

				await Promise.all([
					mainGuild.setChannelPositions([
						{
							channel: eventCategoryChannel.id,
							position: privateCategoryChannel.position + 1,
						},
						...movementList,
					]),
					recordingChannel?.permissionOverwrites.edit(
						recordingChannel.guild.roles.everyone,
						{ VIEW_CHANNEL: !eventIsHappening }
					),
				]);
				await msg.send(
					`✅ I've moved the **${eventCategoryChannel}** channel **up**${extraMessage}.`
				);
			}
			this.debugOutput(this.sortChannelCategories(mainGuild));
			return true;
		} else {
			await msg.send("This command can only be used on Discord!");
			return false;
		}
	}
}
