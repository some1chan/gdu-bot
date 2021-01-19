import { BaseEvent, BasePlugin, Message } from "framed.js";
import Discord from "discord.js";

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
		const pollCommandPrefix = this.plugin.commands.get("poll")
			?.defaultPrefix;
		const newContent = msg.content
			.replace(legacyPollString, `${pollCommandPrefix}poll`)
			.trim();

		if (msg.content.startsWith(legacyPollString)) {
			this.client.plugins.runCommand(
				new Message({
					client: this.client,
					content: newContent,
					discord: {
						base: msg,
					},
				})
			);
		} else if (msg.content.toLocaleLowerCase().includes("tim is inno")) {
			// await msg.channel.send(`${msg.author}, TIM IS GUILTY`);
		}
	}
}
