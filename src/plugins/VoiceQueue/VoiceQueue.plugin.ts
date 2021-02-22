import { BasePlugin, Client, Logger, Place } from "@framedjs/core";
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
	/**
	 * Queue.
	 * 
	 * The key variable is the place it came from.
	 * 
	 * The value variable is a tuple, containing a Map;
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
	}

	setupEvents(): void {
		const discordClient = this.client.discord.client;

		if (discordClient) {
			discordClient.on("voiceStateUpdate", async (oldState, newState) => {
				try {
					Logger.verbose("voiceStateUpdate");

					const oldUserChannel = oldState.channel;
					const newUserChannel = newState.channel;
					const member = oldState.member;

					if (!process.env.QUEUE_VC_CHANNEL_ID) {
						throw new Error(`Environment variable QUEUE_VC_CHANNEL_ID wasn't set`);
					} else if (!process.env.QUEUE_VC_LOCKED_CHANNEL_ID) {
						throw new Error(`Environment variable QUEUE_VC_LOCKED_CHANNEL_ID wasn't set`);
					} else if (!process.env.QUEUE_VC_GUILD_ID) {
						throw new Error(`Environment variable QUEUE_VC_GUILD_ID wasn't set`);
					} else if (!member) {
						throw new Error(`Member shouldn't be undefined`)
					}

					const place: Place = {
						id: process.env.QUEUE_VC_GUILD_ID,
						platform: "discord"
					}
					const queueVCChannel = await discordClient.channels.fetch(
						process.env.QUEUE_VC_CHANNEL_ID, true);
					const queueVCLockedChannel = await discordClient.channels.fetch(
						process.env.QUEUE_VC_LOCKED_CHANNEL_ID, true);
					
					if (member) {
						// newUserChannel?.id == queueVCChannel.id
						
						if (newUserChannel?.id == queueVCChannel.id) {
							// If user joined the VC, add to queue
							await this.addUserToQueue(place, member.id, false);
						} else if (newUserChannel?.id == queueVCLockedChannel.id) {
							// If user joined the locked VC...
							await this.addUserToQueue(place, member.id, true);
						} else if (!newUserChannel) {
							// If user is in no VC, remove from queue
							await this.delUserFromQueue(place, member.id);
						}
					}
				} catch (error) {
					Logger.error(error.stack);
				}
			});
		}
	}

	/**
	 * Get the proper key to the queue Map 
	 * 
	 * @param place 
	 */
	getKey(place: Place): string {
		return `${place.id}.${place.platform}`;
	}
	
	/**
	 * Adds (or edits) a user into the queue.
	 * 
	 * @param place 
	 * @param user User ID
	 * @param hasWent Has the user asked their question in queue?
	 */
	async addUserToQueue(place: Place, user: string, hasWent: boolean) {
		const key = this.getKey(place);

		let data = this.queue.get(key);
		if (!data) {
			this.queue.set(key, new Map());
			data = this.queue.get(key);
		}

		if (!data) {
			throw new Error(`Couldn't find place with key ${key}`);
		}

		data.set(user, hasWent);
		await this.backup();
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

	async delUserFromQueue(place: Place, user: string) {
		const data = this.queue.get(this.getKey(place));

		if (!data) {
			throw new Error(`Couldn't find place with ID ${this.getKey(place)}`);
		}

		data.delete(user);
		await this.backup();
	}

	async clearQueue(place: Place) {
		const data = this.queue.get(this.getKey(place));

		if (!data) {
			throw new Error(`Couldn't find place with key ${this.getKey(place)}`);
		}

		data.clear();
		await this.backup();
	}

	async backup(): Promise<void> {
		const queueString = JSON.stringify(this.queue, this.replacer);
		Logger.debug(queueString);
	}

	// https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
	//#region Map stringifiers
	replacer(_key: unknown, value: unknown) {
		if (value instanceof Map) {
			return {
				dataType: 'Map',
				value: Array.from(value.entries()),
			};
		} else {
			return value;
		}
	}

	reviver(_key: unknown, value: { dataType: unknown, value: Iterable<readonly [unknown, unknown]> }) {
		if (typeof value === 'object' && value !== null) {
			if (value.dataType === 'Map') {
				return new Map(value.value);
			}
		}
		return value;
	}
	//#endregion
}

// 1:15 - 1:24 - 1:29