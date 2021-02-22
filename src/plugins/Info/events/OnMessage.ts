import {
	BaseEvent,
	BasePlugin,
	Discord,
	DiscordMessage,
	Logger,
} from "@framedjs/core";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "helpMessage",
			discord: {
				name: "message",
			},
		});
	}

	async run(msg: Discord.Message): Promise<void> {
		const content = msg.content.toLocaleLowerCase();
		if (
			content == `<@!${msg.client.user?.id}>` ||
			content == `<@${msg.client.user?.id}>`
		) {
			Logger.silly(`OnMsg.ts: Content: "${content}"`);

			try {
				const newMsg = new DiscordMessage({
					client: this.client,
					content: `${content}help`,
					discord: {
						base: msg,
					},
				});
				await newMsg.getMessageElements();
				await this.client.commands.run(newMsg);
			} catch (error) {
				Logger.error(error.stack);
			}
		}
	}
}
