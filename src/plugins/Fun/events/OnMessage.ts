import { BaseEvent, BasePlugin, Discord, DiscordMessage } from "@framedjs/core";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "pollMessage",
			discord: {
				name: "message",
			},
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const legacyPollString = "poll:";

		const commandId = "poll";

		// Message.discordGetPlace, except it doesn't create a new Place if not found
		// This is to workaround a bug in where the new Place is being created elsewhere
		// but events will also try to create a new place too,
		// thus creating duplicates and will error
		const platformId = msg.guild?.id ?? "discord_default";
		const place = this.client.provider.places.get(platformId);
		if (!place) {
			return;
		}

		const commandPrefix = this.plugin.commands
			.get(commandId)
			?.getDefaultPrefix(place);
		const newContent = msg.content
			.replace(legacyPollString, `${commandPrefix}${commandId}`)
			.trim();

		if (msg.content.startsWith(legacyPollString)) {
			const newMsg = new DiscordMessage({
				client: this.client,
				content: newContent,
				discord: {
					base: msg,
				},
			});
			await newMsg.getMessageElements();
			this.client.commands.run(newMsg);
		}
	}
}
