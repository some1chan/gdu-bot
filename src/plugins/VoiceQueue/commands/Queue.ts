import {
	BaseCommand,
	BaseMessage,
	BasePlugin,
	Discord,
	DiscordMessage,
	EmbedHelper,
	Place,
} from "@framedjs/core";
import { stripIndents } from "common-tags";
import VoiceQueue from "../VoiceQueue.plugin";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "queue",
			aliases: ["q"],
			about: "View the voice chat queue.",
			usage: "[page number]",
			userPermissions: {
				discord: {
					permissions: [],
				},
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		if (msg instanceof DiscordMessage && msg.args) {
			if (!process.env.QUEUE_VC_CHANNEL_ID) {
				throw new Error(
					`Environment variable QUEUE_VC_CHANNEL_ID wasn't set`
				);
			} else if (!process.env.QUEUE_VC_LOCKED_CHANNEL_ID) {
				throw new Error(
					`Environment variable QUEUE_VC_LOCKED_CHANNEL_ID wasn't set`
				);
			} else if (!process.env.QUEUE_VC_GUILD_ID) {
				throw new Error(
					`Environment variable QUEUE_VC_GUILD_ID wasn't set`
				);
			}

			const guild =
				msg.discord.guild ??
				msg.discord.client.guilds.cache.get(
					process.env.QUEUE_VC_GUILD_ID
				);
			if (!guild) {
				throw new Error(
					`the queue guild with ID ${process.env.QUEUE_VC_GUILD_ID} couldn't be found`
				);
			}

			const place: Place = {
				id: (await BaseMessage.discordGetPlace(this.client, guild)).id,
				platform: "discord",
			};
			const plugin = this.plugin as VoiceQueue;

			// Updates queue
			const queueVcChannel = await msg.discord.client.channels.fetch(
				process.env.QUEUE_VC_CHANNEL_ID
			);
			const queueVCLockedChannel = await msg.discord.client.channels.fetch(
				process.env.QUEUE_VC_LOCKED_CHANNEL_ID
			);

			await plugin.updateQueue(
				place,
				queueVcChannel as Discord.VoiceChannel,
				queueVCLockedChannel as Discord.VoiceChannel
			);

			// Gest from queue
			const key = plugin.getKey(place);
			let data = plugin.queue.get(key);
			if (!data) data = new Map();

			const descriptionArray: string[] = [];
			let i = 1;
			for (const [user, hasWent] of data) {
				if (!hasWent) {
					const youAreHere =
						user == msg.discord.author.id ? " - You are here!" : "";

					descriptionArray.push(`\`${i}.\` <@${user}>${youAreHere}`);
					i++;
				}
			}

			// Limit of elements on a page
			const elementsOnPage = 10;

			// Minimum page number
			const min = 1;

			// Gets the max page number. Can't be less than 1
			const max = Math.max(
				1,
				Math.ceil(descriptionArray.length / elementsOnPage)
			);

			// Gets the current page number from arguments
			const pageNum = Math.min(
				// The suggested page number defaults to the minimum;
				// cannot be less than the min (1)
				Math.max(min, Number(msg.args[0] ?? min)),
				// Page number cannot be larger than the max
				max
			);

			const startIndex = (pageNum - min) * elementsOnPage;
			const endIndex = startIndex + elementsOnPage;
			const final = descriptionArray.slice(startIndex, endIndex);

			if (final.length == 0) {
				final[0] = `There are currently no users.`;
			}

			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			);
			embed
				.setTitle("Queue")
				.setDescription(
					`To enter the queue, join **<#${process.env.QUEUE_VC_CHANNEL_ID}>**.`
				)
				.addField("Users", final.join("\n"))
				.setFooter(
					this.client.formatting.formatCommandNotation(
						stripIndents`${embed.footer?.text ?? ""}
					Page ${pageNum}/${max} - Use {{prefix}}{{id}} [page number] to access a new page.`,
						this,
						await msg.getPlace()
					),
					embed.footer?.iconURL ?? ""
				);

			await msg.discord.channel.send(embed);
			return true;
		}

		return false;
	}
}
