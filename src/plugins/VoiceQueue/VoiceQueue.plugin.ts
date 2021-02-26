import {
	BaseMessage,
	BasePlugin,
	Client,
	Discord,
	Logger,
	Place,
} from "@framedjs/core";
import { default as Plugin } from "../../database/entities/Plugin";
import * as TypeORM from "typeorm";
import path from "path";

/**
 *
 * ping the person that'll come next
 *
 * warning before entering chat
 * -
 *
 * queue
 */

export default class VoiceQueue extends BasePlugin {
	pluginRepo: TypeORM.Repository<Plugin>;

	/**
	 * Queue.
	 *
	 * The key variable is the place it came from.
	 *
	 * The value variable is a Map, which contains
	 * the users in queue, and the users who have went/out of queue.
	 */
	queue = new Map<string, Map<string, boolean>>();

	constructor(client: Client) {
		super(client, {
			id: "io.gdu.voicequeue",
			name: "Voice Queue",
			description: "Queue users in a voice chat podcast-style.",
			version: "0.1.0",
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
			groupEmote: "🎙️",
			groupName: "Voice Queue",
		});

		this.pluginRepo = TypeORM.getRepository(Plugin);
	}

	async setupEvents(): Promise<void> {
		const discordClient = this.client.discord.client;

		if (discordClient) {
			discordClient.on(
				"voiceStateUpdate",
				async (_oldState, newState) => {
					try {
						Logger.debug("voiceStateUpdate");

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

						const guild = newState.guild;
						const place: Place = {
							id: (
								await BaseMessage.discordGetPlace(
									this.client,
									guild
								)
							).id,
							platform: "discord",
						};

						// Updates queue
						const queueVcChannel = await discordClient.channels.fetch(
							process.env.QUEUE_VC_CHANNEL_ID
						);
						const queueVCLockedChannel = await discordClient.channels.fetch(
							process.env.QUEUE_VC_LOCKED_CHANNEL_ID
						);

						await this.updateQueue(
							place,
							queueVcChannel as Discord.VoiceChannel,
							queueVCLockedChannel as Discord.VoiceChannel
						);
					} catch (error) {
						Logger.error(error.stack);
					}
				}
			);
		}
	}

	/**
	 * Get the proper key to the queue Map
	 *
	 * @param place
	 */
	getKey(place: Place): string {
		return `${place.id}`;
	}

	/**
	 * Adds (or edits) a user into the queue.
	 *
	 * @param place
	 * @param user User ID
	 * @param hasWent Has the user asked their question in queue?
	 */
	async addUserToQueue(
		place: Place,
		user: string,
		hasWent: boolean,
		backup = true
	) {
		const key = this.getKey(place);

		// Gets the place's data
		let data = this.queue.get(key);
		if (!data) {
			this.queue.set(key, new Map());
			data = this.queue.get(key);
		}

		if (!data) {
			throw new Error(`Couldn't find place with key ${key}`);
		}

		data.set(user, hasWent);
		if (backup) await this.backup();
	}

	/**
	 *
	 * @param place
	 * @param user
	 */
	async getUserFromQueue(place: Place, user: string) {
		const data = this.queue.get(this.getKey(place));
		if (!data) return undefined;
		return data.get(user);
	}

	async delUserFromQueue(place: Place, user: string, backup = true) {
		const data = this.queue.get(this.getKey(place));

		if (!data) {
			throw new Error(
				`Couldn't find place with ID ${this.getKey(place)}`
			);
		}

		data.delete(user);
		if (backup) await this.backup();
	}

	async clearQueue(place: Place) {
		const data = this.queue.get(this.getKey(place));

		if (!data) {
			throw new Error(
				`Couldn't find place with key ${this.getKey(place)}`
			);
		}

		data.clear();
		await this.backup();
	}

	/**
	 * Updates the queue by getting any member changes
	 *
	 * @param place
	 * @param queueVc
	 * @param queueLockedVc
	 */
	async updateQueue(
		place: Place,
		queueVc: Discord.VoiceChannel,
		queueLockedVc: Discord.VoiceChannel
	): Promise<void> {
		// Make sure we aren't using old cached versions
		queueVc = (await queueVc.fetch()) as Discord.VoiceChannel;
		queueLockedVc = (await queueLockedVc.fetch()) as Discord.VoiceChannel;

		// Gets the VC members' IDs
		const queueVcMembers = queueVc.members.array();
		let queueVcMemberIds: string[] = [];
		for (const member of queueVcMembers) {
			queueVcMemberIds.push(member.id);
		}
		const queueLockedVcMembers = queueLockedVc.members.array();
		let queueLockedVcMemberIds: string[] = [];
		for (const member of queueLockedVcMembers) {
			queueLockedVcMemberIds.push(member.id);
		}

		// Gets the place's data
		let data = this.queue.get(place.id);
		if (!data) {
			data = new Map();
			this.queue.set(place.id, data);
		}

		// Adds users if they're in the list of VC members, but aren't cached
		// - People in queue
		for (const member of queueVcMembers) {
			await this.addUserToQueue(place, member.id, false, false);
		}
		// - People in the locked VC
		for (const member of queueLockedVcMembers) {
			await this.addUserToQueue(place, member.id, true, false);
		}

		// Removes users if they're not in the list of VC members, but are still cached
		const allMemberIdsInVc = [
			...queueVcMemberIds,
			...queueLockedVcMemberIds,
		];
		for (const [memberId, hasWent] of data) {
			if (!allMemberIdsInVc.includes(memberId)) {
				// If the user went and left, remove them from the queue
				// if (hasWent)
				await this.delUserFromQueue(place, memberId, false);
			}
		}

		// Push all changes
		await this.backup();
	}

	async loadedProviders(): Promise<void> {
		try {
			const data = this.client.provider.plugins.getAll(this.id) as Record<
				string,
				string
			>;

			if (data["queue"]) {
				this.queue = new Map(JSON.parse(data["queue"], this.reviver));
				Logger.debug(`Loaded queue data from database.`);
				Logger.debug(data.queue);
			} else {
				Logger.debug(`No queue data found.`);
			}
		} catch (error) {
			Logger.error(error.stack);
		}
	}

	async backup(): Promise<void> {
		const queueString = JSON.stringify(this.queue, this.replacer);
		Logger.debug(queueString);
		await this.client.provider.plugins.set(this.id, "queue", queueString);
	}

	// https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
	//#region Map stringifiers
	replacer(_key: unknown, value: unknown) {
		if (value instanceof Map) {
			return {
				dataType: "Map",
				value: Array.from(value.entries()),
			};
		} else {
			return value;
		}
	}

	reviver(
		_key: unknown,
		value: {
			dataType: unknown;
			value: Iterable<readonly [unknown, unknown]>;
		}
	) {
		if (typeof value === "object" && value !== null) {
			if (value.dataType === "Map") {
				return new Map(value.value);
			}
		}
		return value;
	}
	//#endregion
}
