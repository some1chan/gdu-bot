import { BaseEvent, Message, BasePlugin, Logger } from "@framedjs/core";
import Discord from "discord.js";

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
		if (content == `<@!${msg.client.user?.id}>`) {
			Logger.silly(`OnMsg.ts: Content: ${content}`);
			// msg.content = `${this.client.defaultPrefix}ping`;

			try {
				const newFramedMsg = new Message({
					client: this.client,
					content: `${this.client.defaultPrefix}help`,
					discord: {
						base: msg,
					},
				});

				await this.plugin.plugins.runCommand(newFramedMsg);
			} catch (error) {
				Logger.error(error.stack);
			}
		}
	}
}
